import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { checkWorkflowLimit } from "../utils/limits.js";
import { Prisma } from "@autoact/db";
import type { ActivateWorkflowRequest, ActivateWorkflowFullRequest } from "@autoact/types";
import { getActivationPreview, activateWorkflow } from "../services/activation.service.js";
import { pauseTrigger, resumeTrigger, removeTrigger } from "../services/trigger.service.js";
import { getWorkflowQueue } from "../utils/queue.js";

export async function workflowRoutes(app: FastifyInstance) {
  app.get("/workflows", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const workflows = await app.prisma.userWorkflow.findMany({
      where: { userId },
      include: {
        template: { select: { name: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send(
      workflows.map((w) => ({
        id: w.id,
        templateId: w.templateId,
        templateName: w.template.name,
        status: w.status,
        createdAt: w.createdAt.toISOString(),
        executionCount: w._count.executions,
        needsReconfiguration: w.needsReconfiguration,
        templateVersion: w.templateVersion,
      }))
    );
  });

  // ---- Get Single Workflow ----
  app.get<{ Params: { id: string } }>(
    "/workflows/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id },
        include: {
          template: { select: { name: true, triggerType: true } },
          _count: { select: { executions: true } },
          executions: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { startedAt: true },
          },
        },
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }
      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const lastExecution = workflow.executions[0]?.startedAt;

      return reply.send({
        id: workflow.id,
        name: workflow.template.name,
        templateId: workflow.templateId,
        templateName: workflow.template.name,
        status: workflow.status,
        triggerConfig: workflow.triggerConfig || { type: workflow.template.triggerType },
        credentialMapping: workflow.credentialMapping,
        createdAt: workflow.createdAt.toISOString(),
        executionCount: workflow._count.executions,
        lastExecution: lastExecution?.toISOString() || null,
        needsReconfiguration: workflow.needsReconfiguration,
        templateVersion: workflow.templateVersion,
      });
    }
  );

  // ---- Activation Preview ----
  app.get<{ Params: { templateId: string } }>(
    "/workflows/activate/preview/:templateId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { templateId } = request.params;

      try {
        const preview = await getActivationPreview(userId, templateId, app.prisma);
        return reply.send(preview);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({ error: err.message });
      }
    }
  );

  // ---- Full Activation ----
  app.post<{ Body: ActivateWorkflowFullRequest }>(
    "/workflows/activate",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { templateId, credentialMapping, triggerConfig } = request.body;

      if (!templateId || !credentialMapping) {
        return reply.status(400).send({ error: "templateId and credentialMapping are required" });
      }

      try {
        const result = await activateWorkflow(
          { userId, templateId, credentialMapping, triggerConfig },
          app.prisma
        );
        return reply.status(201).send(result);
      } catch (err: any) {
        return reply.status(err.statusCode || 500).send({ error: err.message });
      }
    }
  );

  // ---- Test Execution ----
  app.post<{ Params: { id: string } }>(
    "/workflows/:id/test",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id },
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }
      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      // Create test execution
      const execution = await app.prisma.execution.create({
        data: {
          userWorkflowId: id,
          status: "pending",
          isTest: true,
        },
      });

      await app.prisma.userWorkflow.update({
        where: { id },
        data: { status: "testing" },
      });

      const queue = getWorkflowQueue();
      await queue.add("execute-workflow", {
        userWorkflowId: id,
        executionId: execution.id,
        isTest: true,
      });

      return reply.status(201).send({
        executionId: execution.id,
        status: "testing",
      });
    }
  );

  // ---- Pause Workflow ----
  app.post<{ Params: { id: string } }>(
    "/workflows/:id/pause",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id },
        include: { template: true },
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }
      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const triggerConfig = workflow.triggerConfig as { type?: string } | null;
      const triggerType = triggerConfig?.type || workflow.template.triggerType;

      await pauseTrigger(id, triggerType);

      const updated = await app.prisma.userWorkflow.update({
        where: { id },
        data: { status: "paused" },
      });

      return reply.send({ id: updated.id, status: updated.status });
    }
  );

  // ---- Resume Workflow ----
  app.post<{ Params: { id: string } }>(
    "/workflows/:id/resume",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id },
        include: { template: true },
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }
      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const triggerConfig = workflow.triggerConfig as { type?: string; cron?: string } | null;
      const triggerType = triggerConfig?.type || workflow.template.triggerType;

      // Ensure cron expression is available for resume
      const effectiveTriggerConfig = triggerConfig?.cron
        ? triggerConfig as { type: string; cron: string }
        : undefined;

      if (triggerType === "cron" && !effectiveTriggerConfig?.cron) {
        return reply.status(400).send({
          error: "Cannot resume cron workflow: cron expression is missing. Please reconfigure the trigger.",
        });
      }

      await resumeTrigger(id, triggerType, effectiveTriggerConfig);

      const updated = await app.prisma.userWorkflow.update({
        where: { id },
        data: { status: "active" },
      });

      return reply.send({ id: updated.id, status: updated.status });
    }
  );

  // ---- Update Workflow Status (with trigger management) ----
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    "/workflows/:id/status",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;
      const { status } = request.body;

      if (!status || !["active", "paused"].includes(status)) {
        return reply.status(400).send({ error: "Status must be 'active' or 'paused'" });
      }

      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id },
        include: { template: true },
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const triggerConfig = workflow.triggerConfig as { type?: string; cron?: string } | null;
      const triggerType = triggerConfig?.type || workflow.template.triggerType;

      // Manage triggers when status changes
      if (status === "paused" && workflow.status !== "paused") {
        await pauseTrigger(id, triggerType);
      } else if (status === "active" && workflow.status !== "active") {
        const effectiveTriggerConfig = triggerConfig?.cron
          ? triggerConfig as { type: string; cron: string }
          : undefined;
        await resumeTrigger(id, triggerType, effectiveTriggerConfig);
      }

      const updated = await app.prisma.userWorkflow.update({
        where: { id },
        data: { status },
        include: {
          template: { select: { name: true } },
          _count: { select: { executions: true } },
        },
      });

      return reply.send({
        id: updated.id,
        templateId: updated.templateId,
        templateName: updated.template.name,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        executionCount: updated._count.executions,
      });
    }
  );

  // ---- Delete Workflow (with trigger cleanup) ----
  app.delete<{ Params: { id: string } }>(
    "/workflows/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id },
        include: { template: { select: { triggerType: true } } },
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      // Remove cron trigger before deleting
      const triggerConfig = workflow.triggerConfig as { type?: string } | null;
      const triggerType = triggerConfig?.type || workflow.template.triggerType;
      await removeTrigger(id, triggerType);

      await app.prisma.userWorkflow.delete({ where: { id } });

      return reply.status(204).send();
    }
  );
}
