import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { authenticate } from "../plugins/auth.js";
import type { RegisterRequest, LoginRequest } from "@autoact/types";
import { PlanType, PLAN_LIMITS } from "@autoact/types";

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterRequest }>("/auth/register", async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: "Email and password are required" });
    }

    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const salt = randomBytes(32).toString("hex");

    const user = await app.prisma.user.create({
      data: {
        email,
        passwordHash,
        salt,
        subscription: {
          create: {
            plan: PlanType.FREE,
            executionsLimit: PLAN_LIMITS[PlanType.FREE].executionsPerMonth,
          },
        },
      },
      include: { subscription: true },
    });

    const token = app.jwt.sign({ userId: user.id, email: user.email });

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.subscription!.plan as PlanType,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  app.post<{ Body: LoginRequest }>("/auth/login", async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: "Email and password are required" });
    }

    const user = await app.prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const token = app.jwt.sign({ userId: user.id, email: user.email });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: (user.subscription?.plan ?? PlanType.FREE) as PlanType,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  app.get("/auth/me", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      plan: (user.subscription?.plan ?? PlanType.FREE) as PlanType,
      createdAt: user.createdAt.toISOString(),
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            executionsLimit: user.subscription.executionsLimit,
            periodEnd: user.subscription.periodEnd?.toISOString() ?? null,
          }
        : null,
    });
  });
}
