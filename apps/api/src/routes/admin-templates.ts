import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { diffWorkflowJson } from "@autoact/engine";
import { authenticateAdmin } from "../plugins/admin.js";

export async function adminTemplateRoutes(app: FastifyInstance) {
  // GET /admin/templates — List all templates with sync status
  app.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      category?: string;
      search?: string;
      syncStatus?: string;
    };
  }>("/admin/templates", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
    const { category, search, syncStatus } = request.query;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (syncStatus) {
      where.syncStatus = syncStatus;
    }

    const [templates, total] = await Promise.all([
      app.prisma.workflowTemplate.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { userWorkflows: true },
          },
        },
      }),
      app.prisma.workflowTemplate.count({ where }),
    ]);

    return reply.send({
      data: templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        tags: t.tags,
        triggerType: t.triggerType,
        version: t.version,
        syncStatus: t.syncStatus,
        syncError: t.syncError,
        jsonUrl: t.jsonUrl,
        jsonUrlLastSyncedAt: t.jsonUrlLastSyncedAt?.toISOString() ?? null,
        userWorkflowCount: t._count.userWorkflows,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });

  // POST /admin/templates — Create new template
  app.post<{
    Body: {
      name: string;
      description?: string;
      category: string;
      tags: string[];
      triggerType: string;
      jsonUrl?: string;
      definition?: Record<string, unknown>;
    };
  }>("/admin/templates", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, description, category, tags, triggerType, jsonUrl, definition } = request.body;

    let finalDefinition = definition || {};
    let requiredCredentials: string[] = [];
    let checksum: string | null = null;

    if (jsonUrl) {
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        return reply.status(400).send({ error: `Failed to fetch JSON URL: ${response.statusText}` });
      }

      const body = await response.text();
      const parsed = JSON.parse(body);

      finalDefinition = parsed;
      requiredCredentials = Array.isArray(parsed.required_credentials)
        ? parsed.required_credentials
        : [];
      checksum = createHash("sha256").update(body).digest("hex");
    } else if (definition) {
      requiredCredentials = Array.isArray((definition as any).required_credentials)
        ? (definition as any).required_credentials
        : [];
    }

    const template = await app.prisma.workflowTemplate.create({
      data: {
        name,
        description: description ?? null,
        category,
        tags,
        triggerType,
        definition: finalDefinition as any,
        requiredCredentials,
        jsonUrl: jsonUrl ?? null,
        jsonUrlChecksum: checksum,
        jsonUrlLastSyncedAt: jsonUrl ? new Date() : null,
        syncStatus: "idle",
      },
    });

    return reply.status(201).send(template);
  });

  // PATCH /admin/templates/:id — Update template metadata
  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      jsonUrl?: string;
    };
  }>("/admin/templates/:id", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const { name, description, category, tags, jsonUrl } = request.body;

    const existing = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (tags !== undefined) data.tags = tags;

    if (jsonUrl !== undefined) {
      data.jsonUrl = jsonUrl;
      // Reset checksum and lastSyncedAt when URL changes
      if (jsonUrl !== existing.jsonUrl) {
        data.jsonUrlChecksum = null;
        data.jsonUrlLastSyncedAt = null;
      }
    }

    const template = await app.prisma.workflowTemplate.update({
      where: { id },
      data,
    });

    return reply.send(template);
  });

  // DELETE /admin/templates/:id — Delete template
  app.delete<{
    Params: { id: string };
  }>("/admin/templates/:id", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;

    const existing = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const workflowCount = await app.prisma.userWorkflow.count({
      where: { templateId: id },
    });

    if (workflowCount > 0) {
      return reply.status(409).send({
        error: "Cannot delete template with active user workflows",
        workflowCount,
      });
    }

    await app.prisma.workflowTemplate.delete({ where: { id } });

    return reply.status(204).send();
  });

  // POST /admin/templates/:id/sync — Trigger immediate sync
  app.post<{
    Params: { id: string };
  }>("/admin/templates/:id/sync", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    if (!template.jsonUrl) {
      return reply.status(400).send({ error: "Template has no JSON URL configured" });
    }

    // Set syncStatus to syncing
    await app.prisma.workflowTemplate.update({
      where: { id },
      data: { syncStatus: "syncing" },
    });

    try {
      const response = await fetch(template.jsonUrl);
      if (!response.ok) {
        await app.prisma.workflowTemplate.update({
          where: { id },
          data: { syncStatus: "error", syncError: `HTTP ${response.status}: ${response.statusText}` },
        });
        await app.prisma.syncLog.create({
          data: { templateId: id, status: "error", changesSummary: { error: response.statusText } },
        });
        return reply.status(502).send({ error: "Failed to fetch JSON URL" });
      }

      const body = await response.text();
      const newChecksum = createHash("sha256").update(body).digest("hex");

      // No changes
      if (newChecksum === template.jsonUrlChecksum) {
        await app.prisma.workflowTemplate.update({
          where: { id },
          data: { syncStatus: "idle", jsonUrlLastSyncedAt: new Date() },
        });
        await app.prisma.syncLog.create({
          data: { templateId: id, status: "no_change" },
        });
        return reply.send({ template: { id }, diff: null, affectedWorkflows: 0 });
      }

      // Changes detected
      const newJson = JSON.parse(body);
      const diff = diffWorkflowJson(template.definition as Record<string, unknown>, newJson);
      const newVersion = template.version + 1;

      const updatedTemplate = await app.prisma.workflowTemplate.update({
        where: { id },
        data: {
          definition: newJson,
          requiredCredentials: Array.isArray(newJson.required_credentials)
            ? newJson.required_credentials
            : template.requiredCredentials,
          version: newVersion,
          jsonUrlChecksum: newChecksum,
          jsonUrlLastSyncedAt: new Date(),
          syncStatus: "idle",
          syncError: null,
          ...(newJson.name ? { name: newJson.name } : {}),
          ...(newJson.description ? { description: newJson.description } : {}),
          ...(newJson.category ? { category: newJson.category } : {}),
          ...(Array.isArray(newJson.tags) ? { tags: newJson.tags } : {}),
        },
      });

      await app.prisma.syncLog.create({
        data: {
          templateId: id,
          status: "success",
          changesSummary: diff as any,
        },
      });

      // Find affected user workflows
      const affectedWorkflows = await app.prisma.userWorkflow.findMany({
        where: {
          templateId: id,
          templateVersion: { lt: newVersion },
        },
      });

      if ((diff as any).hasBreakingChanges) {
        await app.prisma.userWorkflow.updateMany({
          where: {
            templateId: id,
            templateVersion: { lt: newVersion },
          },
          data: {
            needsReconfiguration: true,
            status: "paused",
          },
        });
      } else {
        await app.prisma.userWorkflow.updateMany({
          where: {
            templateId: id,
            templateVersion: { lt: newVersion },
          },
          data: {
            templateVersion: newVersion,
          },
        });
      }

      return reply.send({
        template: updatedTemplate,
        diff,
        affectedWorkflows: affectedWorkflows.length,
      });
    } catch (err: any) {
      await app.prisma.workflowTemplate.update({
        where: { id },
        data: { syncStatus: "error", syncError: err.message },
      });
      throw err;
    }
  });

  // POST /admin/templates/preview-url — Preview a URL before saving
  app.post<{
    Body: { url: string };
  }>("/admin/templates/preview-url", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { url } = request.body;

    const response = await fetch(url);
    if (!response.ok) {
      return reply.status(400).send({ error: `Failed to fetch URL: ${response.statusText}` });
    }

    const body = await response.text();
    const parsed = JSON.parse(body);

    return reply.send({
      content: parsed,
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      requiredCredentials: Array.isArray(parsed.required_credentials)
        ? parsed.required_credentials
        : [],
      triggerType: parsed.trigger_type ?? parsed.triggerType ?? null,
      name: parsed.name ?? null,
      description: parsed.description ?? null,
      category: parsed.category ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    });
  });
}
