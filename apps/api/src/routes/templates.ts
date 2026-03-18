import type { FastifyInstance } from "fastify";

export async function templateRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      category?: string;
      tag?: string;
      search?: string;
    };
  }>("/templates", async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
    const { category, tag, search } = request.query;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [templates, total] = await Promise.all([
      app.prisma.workflowTemplate.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      app.prisma.workflowTemplate.count({ where }),
    ]);

    return reply.send({
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        triggerType: t.triggerType,
        requiredCredentials: t.requiredCredentials,
        nodeCount: Array.isArray((t.definition as any)?.nodes)
          ? (t.definition as any).nodes.length
          : 0,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });

  app.get<{ Params: { id: string } }>("/templates/:id", async (request, reply) => {
    const { id } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    return reply.send({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      triggerType: template.triggerType,
      requiredCredentials: template.requiredCredentials,
      definition: template.definition,
      createdAt: template.createdAt.toISOString(),
    });
  });
}
