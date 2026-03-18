import type { FastifyInstance } from "fastify";
import { authenticateAdmin } from "../plugins/admin.js";

export async function adminUserRoutes(app: FastifyInstance) {
  // List all users
  app.get<{
    Querystring: { page?: string; pageSize?: string; search?: string };
  }>("/admin/users", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
    const { search } = request.query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (search) {
      where.email = { contains: search, mode: "insensitive" };
    }

    const [users, total] = await Promise.all([
      app.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: { select: { plan: true, status: true } },
          _count: { select: { workflows: true } },
          adminUser: { select: { role: true } },
        },
      }),
      app.prisma.user.count({ where }),
    ]);

    return reply.send({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        plan: u.subscription?.plan ?? "free",
        subscriptionStatus: u.subscription?.status ?? "active",
        workflowCount: u._count.workflows,
        adminRole: u.adminUser?.role ?? null,
        emailVerified: !!u.emailVerifiedAt,
        twoFactorEnabled: u.twoFactorEnabled,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  });

  // Get admin stats
  app.get("/admin/stats", { preHandler: [authenticateAdmin] }, async (_request, reply) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalWorkflows,
      totalExecutions,
      totalTemplates,
      activeSubscriptions,
      executionsToday,
      monthlyRevenue,
    ] = await Promise.all([
      app.prisma.user.count({ where: { deletedAt: null } }),
      app.prisma.userWorkflow.count(),
      app.prisma.execution.count(),
      app.prisma.workflowTemplate.count(),
      app.prisma.subscription.count({ where: { status: "active", plan: { not: "free" } } }),
      app.prisma.execution.count({ where: { startedAt: { gte: startOfDay } } }),
      app.prisma.systemKeyUsageLog.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { cost: true },
      }),
    ]);

    return reply.send({
      totalUsers,
      totalWorkflows,
      totalExecutions,
      totalTemplates,
      activeSubscriptions,
      executionsToday,
      revenueThisMonth: Number(monthlyRevenue._sum.cost ?? 0),
    });
  });

  // Get admin audit logs
  app.get<{
    Querystring: { page?: string; pageSize?: string; action?: string; resourceType?: string; userId?: string };
  }>("/admin/audit-logs", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { getAuditLogs } = await import("../services/audit.service.js");
    const page = parseInt(request.query.page || "1", 10);
    const pageSize = parseInt(request.query.pageSize || "20", 10);

    const result = await getAuditLogs({
      page,
      pageSize,
      userId: request.query.userId,
      action: request.query.action,
      resourceType: request.query.resourceType,
    });

    return reply.send({
      data: result.data.map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: (log as any).user?.email ?? null,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  });
}
