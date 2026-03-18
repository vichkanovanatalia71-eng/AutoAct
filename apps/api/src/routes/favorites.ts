import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

export async function favoritesRoutes(app: FastifyInstance) {
  // List favorites
  app.get("/favorites", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const favorites = await app.prisma.userFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(favorites.map(f => ({ templateId: f.templateId, createdAt: f.createdAt.toISOString() })));
  });

  // Toggle favorite
  app.post<{ Params: { templateId: string } }>(
    "/favorites/:templateId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { templateId } = request.params;

      const existing = await app.prisma.userFavorite.findUnique({
        where: { userId_templateId: { userId, templateId } },
      });

      if (existing) {
        await app.prisma.userFavorite.delete({
          where: { userId_templateId: { userId, templateId } },
        });
        return reply.send({ favorited: false });
      }

      await app.prisma.userFavorite.create({ data: { userId, templateId } });
      return reply.send({ favorited: true });
    },
  );
}
