import type { PrismaClient } from "@autoact/db";
import { PlanType, PLAN_LIMITS } from "@autoact/types";

export async function checkWorkflowLimit(userId: string, prisma: PrismaClient): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = (subscription?.plan ?? PlanType.FREE) as PlanType;

  // Block operations for canceled or past_due subscriptions (except FREE plan)
  if (subscription && plan !== PlanType.FREE) {
    if (subscription.status === "canceled") {
      const error = new Error("Your subscription has been canceled. Please resubscribe to create workflows.");
      (error as any).statusCode = 403;
      throw error;
    }
    if (subscription.status === "past_due") {
      const error = new Error("Your subscription payment is past due. Please update your payment method.");
      (error as any).statusCode = 403;
      throw error;
    }
  }

  const limit = subscription?.workflowsLimit ?? PLAN_LIMITS[plan].workflows;

  const count = await prisma.userWorkflow.count({
    where: { userId },
  });

  if (count >= limit) {
    const error = new Error(`Workflow limit reached for ${plan} plan (${limit} workflows). Please upgrade your plan.`);
    (error as any).statusCode = 403;
    throw error;
  }
}

export async function checkExecutionLimit(userId: string, prisma: PrismaClient): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = (subscription?.plan ?? PlanType.FREE) as PlanType;

  // Block operations for canceled or past_due subscriptions (except FREE plan)
  if (subscription && plan !== PlanType.FREE) {
    if (subscription.status === "canceled") {
      const error = new Error("Your subscription has been canceled. Please resubscribe to run workflows.");
      (error as any).statusCode = 403;
      throw error;
    }
    if (subscription.status === "past_due") {
      const error = new Error("Your subscription payment is past due. Please update your payment method.");
      (error as any).statusCode = 403;
      throw error;
    }
  }

  const limit = subscription?.executionsLimit ?? PLAN_LIMITS[plan].executionsPerMonth;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = await prisma.execution.count({
    where: {
      userWorkflow: { userId },
      startedAt: { gte: startOfMonth },
      isTest: false,
    },
  });

  if (count >= limit) {
    const error = new Error(`Monthly execution limit reached for ${plan} plan (${limit} executions). Please upgrade your plan.`);
    (error as any).statusCode = 403;
    throw error;
  }
}
