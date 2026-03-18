import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

export async function systemKeyRoutes(app: FastifyInstance) {
  app.get("/system-keys", { preHandler: [authenticate] }, async (request, reply) => {
    const keys = await app.prisma.platformApiKey.findMany({
      where: { isActive: true },
      select: {
        id: true,
        serviceType: true,
        displayName: true,
        pricePerExecution: true,
        isActive: true,
      },
      orderBy: { serviceType: "asc" },
    });

    return reply.send(
      keys.map((k) => ({
        id: k.id,
        serviceType: k.serviceType,
        displayName: k.displayName,
        pricePerExecution: Number(k.pricePerExecution),
        isActive: k.isActive,
      }))
    );
  });
}
