import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

export async function executionRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      workflowId?: string;
      page?: string;
      pageSize?: string;
    };
  }>("/executions", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
    const { workflowId } = request.query;

    // Get the user's workflow IDs to scope the query
    const userWorkflows = await app.prisma.userWorkflow.findMany({
      where: { userId },
      select: { id: true },
    });
    const userWorkflowIds = userWorkflows.map((w) => w.id);

    const where: Record<string, unknown> = {
      userWorkflowId: { in: userWorkflowIds },
    };

    if (workflowId) {
      if (!userWorkflowIds.includes(workflowId)) {
        return reply.status(403).send({ error: "Forbidden" });
      }
      where.userWorkflowId = workflowId;
    }

    const [executions, total] = await Promise.all([
      app.prisma.execution.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startedAt: "desc" },
      }),
      app.prisma.execution.count({ where }),
    ]);

    return reply.send({
      data: executions.map((e) => ({
        id: e.id,
        workflowId: e.userWorkflowId,
        status: e.status,
        logs: e.logs,
        startedAt: e.startedAt.toISOString(),
        finishedAt: e.finishedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });
}
