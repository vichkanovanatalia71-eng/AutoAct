import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { authenticateAdmin } from "../plugins/admin.js";
import {
  createTemplateFromUrl,
  generateCoverImage,
  generateDiagramSvg,
} from "../services/template-creator.service.js";

export async function adminRichTemplateRoutes(app: FastifyInstance) {
  // POST /admin/templates/create-from-url — Create template from a JSON URL
  app.post<{
    Body: { jsonUrl: string };
  }>("/admin/templates/create-from-url", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { jsonUrl } = request.body;

    if (!jsonUrl) {
      return reply.status(400).send({ error: "jsonUrl is required" });
    }

    try {
      const template = await createTemplateFromUrl(jsonUrl);
      return reply.status(201).send(template);
    } catch (err: any) {
      request.log.error(err, "Failed to create template from URL");
      return reply.status(400).send({ error: err.message });
    }
  });

  // POST /admin/templates/:id/regenerate-cover — Re-generate cover image
  app.post<{
    Params: { id: string };
  }>("/admin/templates/:id/regenerate-cover", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const coverImageUrl = await generateCoverImage(
      template.name,
      template.description || "",
      template.requiredCredentials,
    );

    if (!coverImageUrl) {
      return reply.status(500).send({ error: "Cover image generation failed. Check GEMINI_API_KEY." });
    }

    const updated = await app.prisma.workflowTemplate.update({
      where: { id },
      data: { coverImageUrl },
    });

    return reply.send(updated);
  });

  // POST /admin/templates/:id/regenerate-diagram — Re-generate diagram SVG
  app.post<{
    Params: { id: string };
  }>("/admin/templates/:id/regenerate-diagram", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const definition = template.definition as Record<string, any>;
    const nodes: any[] = Array.isArray(definition?.nodes)
      ? definition.nodes
      : Array.isArray(definition?.steps)
        ? definition.steps
        : [];

    const diagramSvg = generateDiagramSvg(nodes);
    const diagramUrl = `data:image/svg+xml;base64,${Buffer.from(diagramSvg).toString("base64")}`;

    const updated = await app.prisma.workflowTemplate.update({
      where: { id },
      data: { diagramUrl },
    });

    return reply.send(updated);
  });

  // POST /admin/templates/:id/pdf/add-url — Add a PDF attachment
  app.post<{
    Params: { id: string };
    Body: { title: string; url: string };
  }>("/admin/templates/:id/pdf/add-url", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const { title, url } = request.body;

    if (!title || !url) {
      return reply.status(400).send({ error: "title and url are required" });
    }

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const attachments = Array.isArray(template.pdfAttachments) ? [...(template.pdfAttachments as any[])] : [];
    const newAttachment = {
      id: randomUUID(),
      title,
      url,
      source: "external",
      addedAt: new Date().toISOString(),
    };
    attachments.push(newAttachment);

    const updated = await app.prisma.workflowTemplate.update({
      where: { id },
      data: { pdfAttachments: attachments },
    });

    return reply.send(updated);
  });

  // DELETE /admin/templates/:id/pdf/:pdfId — Remove a PDF attachment
  app.delete<{
    Params: { id: string; pdfId: string };
  }>("/admin/templates/:id/pdf/:pdfId", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id, pdfId } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const attachments = Array.isArray(template.pdfAttachments) ? (template.pdfAttachments as any[]) : [];
    const filtered = attachments.filter((a: any) => a.id !== pdfId);

    if (filtered.length === attachments.length) {
      return reply.status(404).send({ error: "PDF attachment not found" });
    }

    await app.prisma.workflowTemplate.update({
      where: { id },
      data: { pdfAttachments: filtered },
    });

    return reply.status(204).send();
  });

  // POST /admin/templates/:id/video/add-url — Add a video attachment
  app.post<{
    Params: { id: string };
    Body: { title: string; url: string };
  }>("/admin/templates/:id/video/add-url", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const { title, url } = request.body;

    if (!title || !url) {
      return reply.status(400).send({ error: "title and url are required" });
    }

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const attachments = Array.isArray(template.videoAttachments) ? [...(template.videoAttachments as any[])] : [];

    // Parse URL to detect video source and extract video ID
    const videoInfo = parseVideoUrl(url);

    const newAttachment = {
      id: randomUUID(),
      title,
      url,
      source: videoInfo.source,
      videoId: videoInfo.videoId,
      addedAt: new Date().toISOString(),
    };
    attachments.push(newAttachment);

    const updated = await app.prisma.workflowTemplate.update({
      where: { id },
      data: { videoAttachments: attachments },
    });

    return reply.send(updated);
  });

  // DELETE /admin/templates/:id/video/:videoId — Remove a video attachment
  app.delete<{
    Params: { id: string; videoId: string };
  }>("/admin/templates/:id/video/:videoId", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id, videoId } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const attachments = Array.isArray(template.videoAttachments) ? (template.videoAttachments as any[]) : [];
    const filtered = attachments.filter((a: any) => a.id !== videoId);

    if (filtered.length === attachments.length) {
      return reply.status(404).send({ error: "Video attachment not found" });
    }

    await app.prisma.workflowTemplate.update({
      where: { id },
      data: { videoAttachments: filtered },
    });

    return reply.status(204).send();
  });

  // PATCH /admin/templates/:id/card-layout — Save card layout configuration
  app.patch<{
    Params: { id: string };
    Body: { layout: Record<string, unknown> };
  }>("/admin/templates/:id/card-layout", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const { layout } = request.body;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const updated = await app.prisma.workflowTemplate.update({
      where: { id },
      data: { cardLayout: layout as any },
    });

    return reply.send(updated);
  });

  // GET /admin/templates/:id/stats — Get template statistics
  app.get<{
    Params: { id: string };
  }>("/admin/templates/:id/stats", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalActivations,
      activeNow,
      totalExecutions,
      executions7d,
      executions30d,
      successfulExecutions,
    ] = await Promise.all([
      app.prisma.userWorkflow.count({ where: { templateId: id } }),
      app.prisma.userWorkflow.count({ where: { templateId: id, status: "active" } }),
      app.prisma.execution.count({
        where: { userWorkflow: { templateId: id } },
      }),
      app.prisma.execution.count({
        where: {
          userWorkflow: { templateId: id },
          startedAt: { gte: sevenDaysAgo },
        },
      }),
      app.prisma.execution.count({
        where: {
          userWorkflow: { templateId: id },
          startedAt: { gte: thirtyDaysAgo },
        },
      }),
      app.prisma.execution.count({
        where: {
          userWorkflow: { templateId: id },
          status: "success",
        },
      }),
    ]);

    const successRate = totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 10000) / 100
      : 0;

    const conversionRate = template.viewsCount > 0
      ? Math.round((totalActivations / template.viewsCount) * 10000) / 100
      : 0;

    return reply.send({
      totalActivations,
      activeNow,
      totalExecutions,
      executions7d,
      executions30d,
      successRate,
      viewsCount: template.viewsCount,
      conversionRate,
    });
  });

  // GET /admin/templates/:id/stats/executions — Time series execution data
  app.get<{
    Params: { id: string };
    Querystring: { period?: string };
  }>("/admin/templates/:id/stats/executions", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const period = request.query.period || "30d";

    const template = await app.prisma.workflowTemplate.findUnique({ where: { id } });
    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    let days: number;
    switch (period) {
      case "7d":
        days = 7;
        break;
      case "90d":
        days = 90;
        break;
      case "30d":
      default:
        days = 30;
        break;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all user workflow IDs for this template
    const userWorkflows = await app.prisma.userWorkflow.findMany({
      where: { templateId: id },
      select: { id: true },
    });

    const workflowIds = userWorkflows.map((w) => w.id);

    if (workflowIds.length === 0) {
      // Return empty series
      const series: { date: string; total: number; success: number; failed: number }[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i + 1);
        series.push({
          date: d.toISOString().split("T")[0],
          total: 0,
          success: 0,
          failed: 0,
        });
      }
      return reply.send(series);
    }

    const executions = await app.prisma.execution.findMany({
      where: {
        userWorkflowId: { in: workflowIds },
        startedAt: { gte: since },
      },
      select: {
        status: true,
        startedAt: true,
      },
    });

    // Group by day
    const dayMap = new Map<string, { total: number; success: number; failed: number }>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i + 1);
      const dateKey = d.toISOString().split("T")[0];
      dayMap.set(dateKey, { total: 0, success: 0, failed: 0 });
    }

    for (const exec of executions) {
      const dateKey = exec.startedAt.toISOString().split("T")[0];
      const entry = dayMap.get(dateKey);
      if (entry) {
        entry.total++;
        if (exec.status === "success") {
          entry.success++;
        } else if (exec.status === "failed" || exec.status === "error") {
          entry.failed++;
        }
      }
    }

    const series = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return reply.send(series);
  });
}

function parseVideoUrl(url: string): { source: string; videoId: string | null } {
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { source: "youtube", videoId: youtubeMatch[1] };
  }

  // Vimeo
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return { source: "vimeo", videoId: vimeoMatch[1] };
  }

  return { source: "other", videoId: null };
}
