import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { checkWorkflowLimit } from "../utils/limits.js";
import { Prisma } from "@autoact/db";
import type { ActivateWorkflowRequest } from "@autoact/types";

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
      }))
    );
  });

  app.post<{ Body: ActivateWorkflowRequest }>(
    "/workflows",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { templateId, credentialMapping, triggerConfig } = request.body;

      if (!templateId || !credentialMapping) {
        return reply.status(400).send({ error: "templateId and credentialMapping are required" });
      }

      const template = await app.prisma.workflowTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return reply.status(404).send({ error: "Template not found" });
      }

      await checkWorkflowLimit(userId, app.prisma);

      const workflow = await app.prisma.userWorkflow.create({
        data: {
          userId,
          templateId,
          status: "active",
          credentialMapping,
          triggerConfig: triggerConfig ? (triggerConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      return reply.status(201).send({
        id: workflow.id,
        templateId: workflow.templateId,
        templateName: template.name,
        status: workflow.status,
        createdAt: workflow.createdAt.toISOString(),
        executionCount: 0,
      });
    }
  );

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
      });

      if (!workflow) {
        return reply.status(404).send({ error: "Workflow not found" });
      }

      if (workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
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

  app.delete<{ Params: { id: string } }>(
    "/workflows/:id",
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

      await app.prisma.userWorkflow.delete({ where: { id } });

      return reply.status(204).send();
    }
  );
}
