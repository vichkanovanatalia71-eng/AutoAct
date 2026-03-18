import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { createAuditLog } from "../services/audit.service.js";

export async function sessionRoutes(app: FastifyInstance) {
  // List all active sessions
  app.get("/settings/sessions", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const sessions = await app.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastActiveAt: "desc" },
    });

    const currentSessionId = (request.headers["x-session-id"] as string) || null;

    return reply.send(
      sessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        lastActiveAt: s.lastActiveAt.toISOString(),
        isCurrent: currentSessionId ? s.id === currentSessionId : false,
        createdAt: s.createdAt.toISOString(),
      })),
    );
  });

  // Revoke a specific session
  app.delete<{ Params: { id: string } }>(
    "/settings/sessions/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const session = await app.prisma.session.findUnique({
        where: { id },
      });

      if (!session) {
        return reply.status(404).send({ error: "Session not found" });
      }

      if (session.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      await app.prisma.session.update({
        where: { id },
        data: { revokedAt: new Date() },
      });

      await createAuditLog({
        userId,
        action: "session_revoked",
        resourceType: "session",
        resourceId: id,
        ipAddress: request.ip,
      });

      return reply.status(204).send();
    },
  );

  // Revoke all other sessions
  app.post("/settings/sessions/revoke-others", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    // Identify the current session by matching the refresh token hash from the JWT
    // We revoke all sessions except those already revoked
    // To identify the "current" session, we use the request's token info
    // Since we can't directly get the session ID from JWT, we use the IP + user agent as a heuristic
    // A better approach: accept currentSessionId in the body or header
    const currentSessionId = (request.headers["x-session-id"] as string) || null;

    const whereClause: Record<string, unknown> = {
      userId,
      revokedAt: null,
    };

    if (currentSessionId) {
      whereClause.id = { not: currentSessionId };
    }

    const result = await app.prisma.session.updateMany({
      where: whereClause as any,
      data: { revokedAt: new Date() },
    });

    await createAuditLog({
      userId,
      action: "sessions_revoked_all",
      resourceType: "session",
      resourceId: userId,
      ipAddress: request.ip,
    });

    return reply.send({ revokedCount: result.count });
  });
}
