import type { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@autoact/db";

const prisma = new PrismaClient();

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId?: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Verify user still exists and is not soft-deleted
  const user = await prisma.user.findUnique({
    where: { id: request.user.userId },
    select: { id: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    return reply.status(401).send({ error: "Account is deactivated or deleted" });
  }

  // Verify session is not revoked (if sessionId is in JWT payload)
  if (request.user.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: request.user.sessionId },
      select: { revokedAt: true },
    });

    if (!session || session.revokedAt) {
      return reply.status(401).send({ error: "Session has been revoked" });
    }

    // Update last active
    await prisma.session.update({
      where: { id: request.user.sessionId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});
  }
}
