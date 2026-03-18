import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

export async function executionRoutes(app: FastifyInstance) {
  // List executions (paginated, filterable)
  app.get<{
    Querystring: {
      workflowId?: string;
      page?: string;
      pageSize?: string;
      status?: string;
    };
  }>("/executions", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
    const { workflowId, status } = request.query;

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

    if (status) {
      where.status = status;
    }

    const [executions, total] = await Promise.all([
      app.prisma.execution.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startedAt: "desc" },
        include: {
          userWorkflow: { select: { template: { select: { name: true } } } },
        },
      }),
      app.prisma.execution.count({ where }),
    ]);

    return reply.send({
      data: executions.map((e) => ({
        id: e.id,
        workflowId: e.userWorkflowId,
        workflowName: e.userWorkflow?.template?.name ?? null,
        status: e.status,
        isTest: e.isTest,
        durationMs: e.durationMs,
        triggerType: e.triggerType,
        errorNodeId: e.errorNodeId,
        errorMessage: e.errorMessage,
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

  // Get single execution
  app.get<{ Params: { id: string } }>(
    "/executions/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const execution = await app.prisma.execution.findUnique({
        where: { id },
        include: {
          userWorkflow: {
            select: {
              userId: true,
              template: { select: { name: true } },
            },
          },
        },
      });

      if (!execution) {
        return reply.status(404).send({ error: "Execution not found" });
      }
      if (execution.userWorkflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      return reply.send({
        id: execution.id,
        workflowId: execution.userWorkflowId,
        workflowName: execution.userWorkflow.template.name,
        status: execution.status,
        isTest: execution.isTest,
        durationMs: execution.durationMs,
        triggerType: execution.triggerType,
        errorNodeId: execution.errorNodeId,
        errorMessage: execution.errorMessage,
        logs: execution.logs,
        startedAt: execution.startedAt.toISOString(),
        finishedAt: execution.finishedAt?.toISOString() ?? null,
      });
    },
  );

  // Get execution logs (separate endpoint)
  app.get<{ Params: { id: string } }>(
    "/executions/:id/logs",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const execution = await app.prisma.execution.findUnique({
        where: { id },
        include: {
          userWorkflow: { select: { userId: true } },
          executionLogs: { orderBy: { startedAt: "asc" } },
        },
      });

      if (!execution) {
        return reply.status(404).send({ error: "Execution not found" });
      }
      if (execution.userWorkflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      return reply.send({
        executionId: id,
        logs: execution.executionLogs.map((log) => ({
          id: log.id,
          nodeId: log.nodeId,
          nodeType: log.nodeType,
          status: log.status,
          input: log.input,
          output: log.output,
          durationMs: log.durationMs,
          error: log.error,
          startedAt: log.startedAt.toISOString(),
        })),
      });
    },
  );
}
