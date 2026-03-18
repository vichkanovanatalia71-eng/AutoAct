import type { FastifyInstance } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getWorkflowQueue } from "../utils/queue.js";

function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return true; // No secret configured = no verification required

  const expectedSig = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(`sha256=${expectedSig}`, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
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

      // Verify webhook signature if secret is configured
      if (workflow.webhookSecret) {
        const rawBody = typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
        const signature = request.headers["x-webhook-signature"] as string | undefined;

        if (!verifyWebhookSignature(rawBody, signature, workflow.webhookSecret)) {
          return reply.status(401).send({ error: "Invalid webhook signature" });
        }
      }

      // Check execution limit
      const { checkExecutionLimit } = await import("../utils/limits.js");
      await checkExecutionLimit(workflow.userId, app.prisma);

      // Create execution record
      const execution = await app.prisma.execution.create({
        data: {
          userWorkflowId: workflowId,
          status: "pending",
          triggerType: "webhook",
          triggerPayload: request.body ? JSON.parse(JSON.stringify(request.body)) : null,
          logs: [],
        },
      });

      // Enqueue BullMQ job
      const queue = getWorkflowQueue();
      await queue.add("execute-workflow", {
        executionId: execution.id,
        userWorkflowId: workflow.id,
        templateId: workflow.templateId,
        definition: workflow.template.definition,
        credentialMapping: workflow.credentialMapping,
        triggerPayload: request.body,
        triggerType: "webhook",
      });

      return reply.status(201).send({
        executionId: execution.id,
        status: execution.status,
      });
    },
  );
}
