import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { PlanType, PLAN_LIMITS } from "@autoact/types";

export async function billingRoutes(app: FastifyInstance) {
  // Get billing usage
  app.get("/billing/usage", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        _count: { select: { workflows: true } },
      },
    });

    if (!user) return reply.status(404).send({ error: "User not found" });

    const plan = (user.subscription?.plan ?? PlanType.FREE) as PlanType;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [executionsUsed, systemKeyCost] = await Promise.all([
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

    return reply.send({
      plan,
      status: user.subscription?.status ?? "active",
      executionsUsed,
      executionsLimit: user.subscription?.executionsLimit ?? PLAN_LIMITS[plan].executionsPerMonth,
      workflowsUsed: user._count.workflows,
      workflowsLimit: user.subscription?.workflowsLimit ?? PLAN_LIMITS[plan].workflows,
      systemKeyCostCents: Math.round(Number(systemKeyCost._sum.cost ?? 0) * 100),
      periodEnd: user.subscription?.periodEnd?.toISOString() ?? null,
    });
  });

  app.post<{ Body: { plan: string } }>(
    "/billing/checkout",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { plan } = request.body;

      if (!plan || !Object.values(PlanType).includes(plan as PlanType)) {
        return reply.status(400).send({ error: "Invalid plan" });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeSecretKey) {
        return reply.send({
          url: `https://checkout.stripe.com/mock?plan=${plan}&user=${userId}`,
        });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({ email: user.email });
        customerId = customer.id;
        await app.prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });
      }

      const priceAmount = PLAN_LIMITS[plan as PlanType].price * 100;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `AutoAct ${plan} Plan` },
              unit_amount: priceAmount,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/billing?success=true`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/billing?canceled=true`,
        metadata: { userId, plan },
      });

      return reply.send({ url: session.url });
    },
  );

  app.post(
    "/billing/portal",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeSecretKey) {
        return reply.send({
          url: `https://billing.stripe.com/mock/portal?user=${userId}`,
        });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.stripeCustomerId) {
        return reply.status(404).send({ error: "No billing account found" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/billing`,
      });

      return reply.send({ url: session.url });
    },
  );

  app.post("/billing/webhook", async (request, reply) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      return reply.status(501).send({ error: "Stripe is not configured" });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);

    const signature = request.headers["stripe-signature"] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        (request.body as string) || "",
        signature,
        webhookSecret,
      );
    } catch (err) {
      return reply.status(400).send({ error: "Invalid webhook signature" });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const { userId, plan } = session.metadata;

        if (userId && plan) {
          const planType = plan as PlanType;
          await app.prisma.subscription.upsert({
            where: { userId },
            update: {
              plan: planType,
              status: "active",
              stripeSubscriptionId: session.subscription,
              executionsLimit: PLAN_LIMITS[planType].executionsPerMonth,
              workflowsLimit: planType === PlanType.BUSINESS ? 999999 : PLAN_LIMITS[planType].workflows,
            },
            create: {
              userId,
              plan: planType,
              status: "active",
              stripeSubscriptionId: session.subscription,
              executionsLimit: PLAN_LIMITS[planType].executionsPerMonth,
              workflowsLimit: planType === PlanType.BUSINESS ? 999999 : PLAN_LIMITS[planType].workflows,
            },
          });

          // Update user plan field
          await app.prisma.user.update({
            where: { id: userId },
            data: { plan: planType },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const existing = await app.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (existing) {
          await app.prisma.subscription.update({
            where: { id: existing.id },
            data: {
              status: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "active",
              periodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const existing = await app.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (existing) {
          await app.prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan: PlanType.FREE,
              status: "canceled",
              stripeSubscriptionId: null,
              executionsLimit: PLAN_LIMITS[PlanType.FREE].executionsPerMonth,
              workflowsLimit: PLAN_LIMITS[PlanType.FREE].workflows,
            },
          });

          await app.prisma.user.update({
            where: { id: existing.userId },
            data: { plan: PlanType.FREE },
          });
        }
        break;
      }
    }

    return reply.send({ received: true });
  });
}
