import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { PlanType, PLAN_LIMITS } from "@autoact/types";

export async function mobileRoutes(app: FastifyInstance) {
  // Register push token
  app.post<{ Body: { token: string; platform: string } }>(
    "/mobile/register-push-token",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { token, platform } = request.body;

      if (!token || !platform) {
        return reply.status(400).send({ error: "token and platform are required" });
      }

      if (!["ios", "android"].includes(platform)) {
        return reply.status(400).send({ error: "platform must be 'ios' or 'android'" });
      }

      await app.prisma.pushToken.upsert({
        where: { token },
        update: { userId, platform },
        create: { userId, token, platform },
      });

      return reply.send({ success: true });
    },
  );

  // Delete push token
  app.delete<{ Body: { token: string } }>(
    "/mobile/push-token",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({ error: "token is required" });
      }

      const existing = await app.prisma.pushToken.findUnique({
        where: { token },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Push token not found" });
      }

      if (existing.userId !== request.user.userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      await app.prisma.pushToken.delete({ where: { token } });

      return reply.send({ success: true });
    },
  );

  // Mobile dashboard - optimized single-query approach
  app.get("/mobile/dashboard", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [user, recentExecutions] = await Promise.all([
      app.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
          _count: { select: { workflows: true } },
          workflows: {
            select: {
              id: true,
              status: true,
              needsReconfiguration: true,
              template: { select: { name: true } },
            },
          },
        },
      }),
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

    const activeWorkflows = user.workflows.filter((w) => w.status === "active").length;

    // Count executions today and this month from the recent + separate counts
    const [executionsToday, executionsThisPeriod, systemKeyCostAgg] = await Promise.all([
      app.prisma.execution.count({
        where: {
          userWorkflow: { userId },
          startedAt: { gte: startOfToday },
        },
      }),
      app.prisma.execution.count({
        where: {
          userWorkflow: { userId },
          startedAt: { gte: startOfMonth },
          isTest: false,
        },
      }),
      app.prisma.systemKeyUsageLog.aggregate({
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { cost: true },
      }),
    ]);

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

    const alerts = user.workflows
      .filter((w) => w.status === "needs_attention" || w.needsReconfiguration)
      .map((w) => ({
        id: w.id,
        workflowId: w.id,
        workflowName: w.template.name,
        status: w.status,
        needsReconfiguration: w.needsReconfiguration,
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
  });

  // App config
  app.get("/mobile/app-config", async (_request, reply) => {
    return reply.send({
      minVersion: process.env.MOBILE_MIN_VERSION || "1.0.0",
      currentVersion: process.env.MOBILE_CURRENT_VERSION || "1.0.0",
      forceUpdate: process.env.MOBILE_FORCE_UPDATE === "true",
      maintenanceMode: process.env.MAINTENANCE_MODE === "true",
    });
  });
}
