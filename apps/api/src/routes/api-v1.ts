import type { FastifyInstance } from "fastify";

async function authenticateApiKey(request: any, reply: any, requiredScopes?: string[]): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ak_")) {
    // Fall back to JWT
    try {
      await request.jwtVerify();
      return;
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  }

  const rawKey = authHeader.slice(7);
  const { validateApiKey } = await import("../services/api-key.service.js");
  const apiKey = await validateApiKey(rawKey);

  if (!apiKey) {
    return reply.status(401).send({ error: "Invalid or expired API key" });
  }

  // Enforce scopes if API key has scopes defined and operation requires specific scopes
  if (requiredScopes && requiredScopes.length > 0 && apiKey.scopes && apiKey.scopes.length > 0) {
    const hasScope = requiredScopes.some((scope) => apiKey.scopes.includes(scope) || apiKey.scopes.includes("*"));
    if (!hasScope) {
      return reply.status(403).send({ error: `Insufficient API key scopes. Required: ${requiredScopes.join(" or ")}` });
    }
  }

  request.user = { userId: apiKey.userId, email: "" };
}

function withScopes(...scopes: string[]) {
  return async (request: any, reply: any) => authenticateApiKey(request, reply, scopes);
}

export async function apiV1Routes(app: FastifyInstance) {
  // List workflows
  app.get("/api/v1/workflows", { preHandler: [withScopes("workflows:read", "workflows:write", "*")] }, async (request, reply) => {
    const { userId } = request.user;

    const workflows = await app.prisma.userWorkflow.findMany({
      where: { userId },
      include: { template: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      data: workflows.map((w) => ({
        id: w.id,
        name: w.name || w.template.name,
        status: w.status,
        templateId: w.templateId,
        createdAt: w.createdAt.toISOString(),
      })),
    });
  });

  // Trigger workflow execution
  app.post<{ Params: { id: string } }>(
    "/api/v1/workflows/:id/execute",
    { preHandler: [withScopes("workflows:execute", "workflows:write", "*")] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const workflow = await app.prisma.userWorkflow.findUnique({ where: { id } });
      if (!workflow || workflow.userId !== userId) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      if (workflow.status !== "active") {
        return reply.status(409).send({ error: "Workflow is not active" });
      }

      const { checkExecutionLimit } = await import("../utils/limits.js");
      await checkExecutionLimit(userId, app.prisma);

      const execution = await app.prisma.execution.create({
        data: {
          userWorkflowId: id,
          status: "pending",
          triggerType: "api",
          triggerPayload: request.body ? JSON.parse(JSON.stringify(request.body)) : null,
        },
      });

      const { getWorkflowQueue } = await import("../utils/queue.js");
      const queue = getWorkflowQueue();
      await queue.add("execute-workflow", {
        executionId: execution.id,
        userWorkflowId: id,
        triggerPayload: request.body,
      });

      return reply.status(201).send({
        executionId: execution.id,
        status: "pending",
      });
    },
  );

  // Get execution status
  app.get<{ Params: { id: string } }>(
    "/api/v1/executions/:id",
    { preHandler: [withScopes("executions:read", "workflows:read", "*")] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const execution = await app.prisma.execution.findUnique({
        where: { id },
        include: {
          userWorkflow: { select: { userId: true } },
        },
      });

      if (!execution || execution.userWorkflow.userId !== userId) {
        return reply.status(404).send({ error: "Execution not found" });
      }

      return reply.send({
        id: execution.id,
        workflowId: execution.userWorkflowId,
        status: execution.status,
        startedAt: execution.startedAt.toISOString(),
        finishedAt: execution.finishedAt?.toISOString() ?? null,
        durationMs: execution.durationMs,
      });
    },
  );

  // List executions for a workflow
  app.get<{ Params: { id: string }; Querystring: { page?: string; pageSize?: string } }>(
    "/api/v1/workflows/:id/executions",
    { preHandler: [withScopes("executions:read", "workflows:read", "*")] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;
      const page = Math.max(1, parseInt(request.query.page || "1", 10));
      const pageSize = Math.min(100, parseInt(request.query.pageSize || "20", 10));

      const workflow = await app.prisma.userWorkflow.findUnique({ where: { id } });
      if (!workflow || workflow.userId !== userId) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      const [executions, total] = await Promise.all([
        app.prisma.execution.findMany({
          where: { userWorkflowId: id },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { startedAt: "desc" },
        }),
        app.prisma.execution.count({ where: { userWorkflowId: id } }),
      ]);

      return reply.send({
        data: executions.map((e) => ({
          id: e.id,
          workflowId: e.userWorkflowId,
          status: e.status,
          startedAt: e.startedAt.toISOString(),
          finishedAt: e.finishedAt?.toISOString() ?? null,
          durationMs: e.durationMs,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    },
  );
}
