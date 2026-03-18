import type { FastifyInstance } from "fastify";
import { authenticateAdmin } from "../plugins/admin.js";

export async function adminSyncLogRoutes(app: FastifyInstance) {
  // GET /admin/sync-logs — Paginated list of sync logs
  app.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      templateId?: string;
      status?: string;
    };
  }>("/admin/sync-logs", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
    const { templateId, status } = request.query;

    const where: Record<string, unknown> = {};

    if (templateId) {
      where.templateId = templateId;
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      app.prisma.syncLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { syncedAt: "desc" },
        include: {
          template: {
            select: { name: true },
          },
        },
      }),
      app.prisma.syncLog.count({ where }),
    ]);

    return reply.send({
      data: logs.map((log: any) => ({
        id: log.id,
        templateId: log.templateId,
        templateName: log.template.name,
        status: log.status,
        changesSummary: log.changesSummary,
        syncedAt: log.syncedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });
}
