import type { FastifyInstance } from "fastify";
import { Queue } from "bullmq";

let workflowQueue: Queue | null = null;

function getQueue(): Queue {
  if (!workflowQueue) {
    workflowQueue = new Queue("workflow-executions", {
      connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
    });
  }
  return workflowQueue;
}

export async function webhookRoutes(app: FastifyInstance) {
  app.post<{ Params: { workflowId: string } }>(
    "/webhooks/:workflowId",
    async (request, reply) => {
      const { workflowId } = request.params;

      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id: workflowId },
        include: { template: true },
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      if (workflow.status !== "active") {
        return reply.status(409).send({ error: "Workflow is not active" });
      }

      // Check execution limit
      const { checkExecutionLimit } = await import("../utils/limits.js");
      await checkExecutionLimit(workflow.userId, app.prisma);

      // Create execution record
      const execution = await app.prisma.execution.create({
        data: {
          userWorkflowId: workflowId,
          status: "pending",
          logs: [],
        },
      });

      // Enqueue BullMQ job
      const queue = getQueue();
      await queue.add("execute-workflow", {
        executionId: execution.id,
        workflowId: workflow.id,
        templateId: workflow.templateId,
        definition: workflow.template.definition,
        credentialMapping: workflow.credentialMapping,
        triggerPayload: request.body,
      });

      return reply.status(201).send({
        executionId: execution.id,
        status: execution.status,
      });
    }
  );
}
