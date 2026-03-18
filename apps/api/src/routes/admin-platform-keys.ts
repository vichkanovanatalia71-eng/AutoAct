import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { authenticateAdmin } from "../plugins/admin.js";
import { encrypt } from "../utils/crypto.js";

const PLATFORM_SALT = "platform-api-keys-salt";

export async function adminPlatformKeyRoutes(app: FastifyInstance) {
  const preHandler = [authenticate, authenticateAdmin];

  // List all platform API keys
  app.get("/admin/platform-keys", { preHandler }, async (request, reply) => {
    const keys = await app.prisma.platformApiKey.findMany({
      orderBy: { createdAt: "desc" },
    });

    return reply.send(
      keys.map((k) => ({
        id: k.id,
        serviceType: k.serviceType,
        displayName: k.displayName,
        pricePerExecution: Number(k.pricePerExecution),
        isActive: k.isActive,
        createdAt: k.createdAt.toISOString(),
      }))
    );
  });

  // Create a platform API key
  app.post<{
    Body: {
      serviceType: string;
      displayName: string;
      apiKey: string;
      pricePerExecution: number;
    };
  }>("/admin/platform-keys", { preHandler }, async (request, reply) => {
    const { serviceType, displayName, apiKey, pricePerExecution } = request.body;

    if (!serviceType || !displayName || !apiKey || pricePerExecution == null) {
      return reply.status(400).send({
        error: "serviceType, displayName, apiKey, and pricePerExecution are required",
      });
    }

    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      return reply.status(500).send({ error: "Encryption not configured" });
    }

    const { pbkdf2Sync } = await import("node:crypto");
    const derivedKey = pbkdf2Sync(masterKey, PLATFORM_SALT, 100_000, 32, "sha512");
    const { encrypted, iv } = encrypt(apiKey, derivedKey);

    const key = await app.prisma.platformApiKey.create({
      data: {
        serviceType,
        displayName,
        encryptedKey: encrypted,
        iv,
        pricePerExecution,
        isActive: true,
      },
    });

    return reply.status(201).send({
      id: key.id,
      serviceType: key.serviceType,
      displayName: key.displayName,
      pricePerExecution: Number(key.pricePerExecution),
      isActive: key.isActive,
      createdAt: key.createdAt.toISOString(),
    });
  });

  // Update a platform API key
  app.patch<{
    Params: { id: string };
    Body: {
      displayName?: string;
      pricePerExecution?: number;
      isActive?: boolean;
      apiKey?: string;
    };
  }>("/admin/platform-keys/:id", { preHandler }, async (request, reply) => {
    const { id } = request.params;
    const { displayName, pricePerExecution, isActive, apiKey } = request.body;

    const existing = await app.prisma.platformApiKey.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Platform key not found" });
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (pricePerExecution !== undefined) updateData.pricePerExecution = pricePerExecution;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (apiKey) {
      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        return reply.status(500).send({ error: "Encryption not configured" });
      }
      const { pbkdf2Sync } = await import("node:crypto");
      const derivedKey = pbkdf2Sync(masterKey, PLATFORM_SALT, 100_000, 32, "sha512");
      const { encrypted, iv } = encrypt(apiKey, derivedKey);
      updateData.encryptedKey = encrypted;
      updateData.iv = iv;
    }

    const updated = await app.prisma.platformApiKey.update({
      where: { id },
      data: updateData,
    });

    return reply.send({
      id: updated.id,
      serviceType: updated.serviceType,
      displayName: updated.displayName,
      pricePerExecution: Number(updated.pricePerExecution),
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    });
  });

  // Delete a platform API key
  app.delete<{ Params: { id: string } }>(
    "/admin/platform-keys/:id",
    { preHandler },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await app.prisma.platformApiKey.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: "Platform key not found" });
      }

      await app.prisma.platformApiKey.delete({ where: { id } });
      return reply.status(204).send();
    }
  );

  // System key usage report
  app.get<{
    Querystring: { from?: string; to?: string };
  }>("/admin/system-key-usage", { preHandler }, async (request, reply) => {
    const { from, to } = request.query;

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const usageLogs = await app.prisma.systemKeyUsageLog.findMany({
      where,
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Aggregate by service type
    const aggregated: Record<string, { count: number; totalCost: number }> = {};
    for (const log of usageLogs) {
      const key = log.serviceType;
      if (!aggregated[key]) {
        aggregated[key] = { count: 0, totalCost: 0 };
      }
      aggregated[key].count++;
      aggregated[key].totalCost += Number(log.cost);
    }

    return reply.send({
      summary: Object.entries(aggregated).map(([service, data]) => ({
        serviceType: service,
        usageCount: data.count,
        totalCost: Math.round(data.totalCost * 1000000) / 1000000,
      })),
      recentLogs: usageLogs.slice(0, 100).map((l) => ({
        id: l.id,
        userId: l.userId,
        userEmail: l.user.email,
        executionId: l.executionId,
        serviceType: l.serviceType,
        cost: Number(l.cost),
        stripeUsageRecordId: l.stripeUsageRecordId,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  });
}
