import type { FastifyInstance } from "fastify";

export async function publicViewRoutes(app: FastifyInstance) {
  // POST /templates/:id/view — Increment view count (no auth required)
  app.post<{
    Params: { id: string };
  }>("/templates/:id/view", async (request, reply) => {
    const { id } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const updated = await app.prisma.workflowTemplate.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return reply.send({ viewsCount: updated.viewsCount });
  });
}
