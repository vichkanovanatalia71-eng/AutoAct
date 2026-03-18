import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { PlanType, PLAN_LIMITS } from "@autoact/types";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
    const [
      user,
      activeWorkflows,
      executionsToday,
      systemKeyCostAgg,
      executionsThisPeriod,
      alertWorkflows,
      recentExecutions,
    ] = await Promise.all([
      // User with subscription and workflow count
      app.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
          _count: { select: { workflows: true } },
        },
      }),
      // Active workflow count
      app.prisma.userWorkflow.count({
        where: { userId, status: "active" },
      }),
      // Executions today
      app.prisma.execution.count({
        where: {
          userWorkflow: { userId },
          startedAt: { gte: startOfToday },
        },
      }),
      // System key cost this month
      app.prisma.systemKeyUsageLog.aggregate({
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { cost: true },
      }),
      // Executions this billing period
      app.prisma.execution.count({
        where: {
          userWorkflow: { userId },
          startedAt: { gte: startOfMonth },
          isTest: false,
        },
      }),
      // Workflows needing attention
      app.prisma.userWorkflow.findMany({
        where: {
          userId,
          OR: [
            { status: "needs_attention" },
            { needsReconfiguration: true },
          ],
        },
        include: {
          template: { select: { name: true } },
        },
      }),
      // Recent activity - last 10 executions
      app.prisma.execution.findMany({
        where: { userWorkflow: { userId } },
        include: {
          userWorkflow: {
            include: { template: { select: { name: true } } },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
    ]);

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const plan = (user.subscription?.plan ?? PlanType.FREE) as PlanType;

    const stats = {
      activeWorkflows,
      executionsToday,
      systemKeyCost: Math.round(Number(systemKeyCostAgg._sum.cost ?? 0) * 100),
    };

    const usage = {
      plan,
      status: user.subscription?.status ?? "active",
      executionsUsed: executionsThisPeriod,
      executionsLimit: user.subscription?.executionsLimit ?? PLAN_LIMITS[plan].executionsPerMonth,
      workflowsUsed: user._count.workflows,
      workflowsLimit: user.subscription?.workflowsLimit ?? PLAN_LIMITS[plan].workflows,
      periodEnd: user.subscription?.periodEnd?.toISOString() ?? null,
    };

    const alerts = alertWorkflows.map((w) => ({
      id: w.id,
      workflowId: w.id,
      workflowName: w.template.name,
      type: w.needsReconfiguration ? "update_required" : w.status === "needs_attention" ? "needs_attention" : "error",
      message: w.needsReconfiguration
        ? "Шаблон оновлено, потрібна переналаштування"
        : w.status === "needs_attention"
          ? "Воркфлоу потребує уваги"
          : "Помилка виконання воркфлоу",
    }));

    const recentActivity = recentExecutions.map((e) => ({
      id: e.id,
      workflowId: e.userWorkflowId,
      workflowName: e.userWorkflow.template.name,
      status: e.status,
      startedAt: e.startedAt.toISOString(),
      finishedAt: e.finishedAt?.toISOString() ?? null,
      durationMs: e.durationMs,
      isTest: e.isTest,
    }));

    return reply.send({ stats, usage, alerts, recentActivity });
    } catch (err) {
      request.log.error(err, "Dashboard data fetch failed");
      return reply.status(500).send({ error: "Failed to load dashboard data" });
    }
  });
}
