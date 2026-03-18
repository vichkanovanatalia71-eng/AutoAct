import type { FastifyInstance } from "fastify";
import { authenticateAdmin } from "../plugins/admin.js";
import { analyzeWorkflow, getLatestAnalysis } from "../services/node-analyzer.service.js";
import {
  applyNodeReplacements,
  applyOptimizations,
  updateReportStatus,
} from "../services/workflow-patcher.service.js";

export async function adminAnalysisRoutes(app: FastifyInstance) {
  // POST /admin/templates/:id/analyze — Run AI analysis
  app.post<{
    Params: { id: string };
  }>("/admin/templates/:id/analyze", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;

    const template = await app.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return reply.status(404).send({ error: "Шаблон не знайдено" });
    }

    const result = await analyzeWorkflow(id, template.definition);

    if (!result) {
      return reply.status(503).send({ error: "AI аналіз недоступний (GEMINI_API_KEY не налаштований)" });
    }

    // Fetch the saved report
    const report = await getLatestAnalysis(id);

    return reply.send({
      id: report?.id,
      templateId: id,
      nodeAnalysis: result.nodeAnalysis,
      optimizationSuggestions: result.optimizationSuggestions,
      nodesToCreate: result.nodesToCreate,
      status: report?.status || "pending",
      appliedAt: report?.appliedAt || null,
      createdAt: report?.createdAt || new Date().toISOString(),
    });
  });

  // GET /admin/templates/:id/analysis — Get latest analysis report
  app.get<{
    Params: { id: string };
  }>("/admin/templates/:id/analysis", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;

    const report = await getLatestAnalysis(id);

    if (!report) {
      return reply.send(null);
    }

    return reply.send({
      id: report.id,
      templateId: report.templateId,
      nodeAnalysis: report.nodeAnalysis,
      optimizationSuggestions: report.optimizationSuggestions,
      nodesToCreate: report.nodesToCreate,
      status: report.status,
      appliedAt: report.appliedAt,
      createdAt: report.createdAt,
    });
  });

  // POST /admin/templates/:id/analysis/apply — Apply selected suggestions
  app.post<{
    Params: { id: string };
    Body: {
      nodeReplacements?: string[];
      optimizations?: string[];
    };
  }>("/admin/templates/:id/analysis/apply", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { id } = request.params;
    const { nodeReplacements = [], optimizations = [] } = request.body || {};

    const report = await getLatestAnalysis(id);
    if (!report) {
      return reply.status(404).send({ error: "Звіт аналізу не знайдено" });
    }

    // Apply node replacements
    if (nodeReplacements.length > 0) {
      await applyNodeReplacements(id, nodeReplacements, report.id);
    }

    // Apply optimizations
    if (optimizations.length > 0) {
      await applyOptimizations(id, optimizations, report.id);
    }

    // Update report status
    await updateReportStatus(report.id, nodeReplacements, optimizations);

    // Return updated template
    const template = await app.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    return reply.send({
      success: true,
      appliedReplacements: nodeReplacements.length,
      appliedOptimizations: optimizations.length,
      newVersion: template?.version,
    });
  });
}
