import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@autoact/db";

const prisma = new PrismaClient();

async function processBillingJob(): Promise<void> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  // Get unbilled usage logs
  const unbilledLogs = await prisma.systemKeyUsageLog.findMany({
    where: { stripeUsageRecordId: null },
    include: {
      user: {
        include: {
          subscription: true,
        },
      },
    },
  });

  if (unbilledLogs.length === 0) {
    console.log("[billing] No unbilled system key usage");
    return;
  }

  // Aggregate by userId
  const userAggregates: Record<
    string,
    { totalCostCents: number; logIds: string[]; stripeCustomerId: string | null; subscriptionId: string | null }
  > = {};

  for (const log of unbilledLogs) {
    if (!userAggregates[log.userId]) {
      userAggregates[log.userId] = {
        totalCostCents: 0,
        logIds: [],
        stripeCustomerId: log.user.stripeCustomerId,
        subscriptionId: log.user.subscription?.stripeSubscriptionId || null,
      };
    }
    // Convert decimal cost to cents (1 unit = $0.01)
    userAggregates[log.userId].totalCostCents += Math.round(Number(log.cost) * 100);
    userAggregates[log.userId].logIds.push(log.id);
  }

  if (!stripeSecretKey) {
    // Stub mode: just mark as billed with a stub ID
    console.log("[billing] Stripe not configured — marking usage as stub-billed");
    for (const [userId, data] of Object.entries(userAggregates)) {
      const stubId = `stub_${Date.now()}_${userId.slice(0, 8)}`;
      await prisma.systemKeyUsageLog.updateMany({
        where: { id: { in: data.logIds } },
        data: { stripeUsageRecordId: stubId },
      });
      console.log(
        `[billing] User ${userId}: ${data.totalCostCents} cents (${data.logIds.length} records) → ${stubId}`
      );
    }
    return;
  }

  // Real Stripe billing
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeSecretKey);

  for (const [userId, data] of Object.entries(userAggregates)) {
    if (!data.subscriptionId || data.totalCostCents === 0) {
      console.log(`[billing] Skipping user ${userId}: no subscription or zero cost`);
      continue;
    }

    try {
      // Find the metered subscription item
      const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
      const meteredItem = subscription.items.data.find(
        (item: any) => item.price?.recurring?.usage_type === "metered"
      );

      if (!meteredItem) {
        console.log(`[billing] User ${userId}: no metered subscription item found`);
        continue;
      }

      // Report usage to Stripe
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(
        meteredItem.id,
        {
          quantity: data.totalCostCents,
          action: "increment",
          timestamp: Math.floor(Date.now() / 1000),
        }
      );

      // Mark logs as billed
      await prisma.systemKeyUsageLog.updateMany({
        where: { id: { in: data.logIds } },
        data: { stripeUsageRecordId: usageRecord.id },
      });

      console.log(
        `[billing] User ${userId}: billed ${data.totalCostCents} cents → ${usageRecord.id}`
      );
    } catch (err) {
      console.error(`[billing] Failed to bill user ${userId}:`, err);
    }
  }
}

export async function startBillingWorker(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const connection = { url: redisUrl };

  const billingQueue = new Queue("billing-sync", { connection });

  // Create daily repeatable job
  await billingQueue.add(
    "process-system-key-billing",
    {},
    {
      repeat: {
        pattern: "0 2 * * *", // Every day at 2:00 AM
      },
      jobId: "daily-billing-sync",
    }
  );

  const worker = new Worker(
    "billing-sync",
    async () => {
      await processBillingJob();
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    console.error(`[billing-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[billing-worker] Job ${job?.id} completed`);
  });

  console.log("[billing-worker] Started — daily billing sync at 2:00 AM");
}
