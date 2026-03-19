import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { authenticate } from "../plugins/auth.js";
import { createAuditLog } from "../services/audit.service.js";
import type { UpdateProfileRequest, ChangePasswordRequest, NotificationPrefsRequest } from "@autoact/types";

export async function settingsRoutes(app: FastifyInstance) {
  // Update profile
  app.patch<{ Body: UpdateProfileRequest }>(
    "/settings/profile",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { email, timezone, language } = request.body as UpdateProfileRequest & { timezone?: string; language?: string };

      if (email) {
        const existing = await app.prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== userId) {
          return reply.status(409).send({ error: "Email already in use" });
        }
      }

      const updateData: Record<string, unknown> = {};
      if (email) {
        // Email change requires verification — set new email and clear verification
        updateData.email = email;
        updateData.emailVerifiedAt = null;
        // TODO: Send verification email to the new address before actually changing
        // For now, immediately update but require re-verification
      }
      if (timezone !== undefined) {
        updateData.timezone = timezone;
      }
      if (language !== undefined) {
        updateData.language = language;
      }

      const user = await app.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      await createAuditLog({
        userId,
        action: "profile_updated",
        resourceType: "user",
        resourceId: userId,
        ipAddress: request.ip,
      });

      return reply.send({ id: user.id, email: user.email, timezone: user.timezone, language: user.language });
    },
  );

  // Change password
  app.patch<{ Body: ChangePasswordRequest }>(
    "/settings/password",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { currentPassword, newPassword } = request.body;

      if (!currentPassword || !newPassword) {
        return reply.status(400).send({ error: "Current and new password are required" });
      }

      if (newPassword.length < 8) {
        return reply.status(400).send({ error: "Password must be at least 8 characters" });
      }

      const user = await app.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: "Current password is incorrect" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await app.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

      await createAuditLog({
        userId,
        action: "password_changed",
        resourceType: "user",
        resourceId: userId,
        ipAddress: request.ip,
      });

      return reply.send({ message: "Password changed successfully" });
    },
  );

  // Update notification preferences
  app.patch<{ Body: NotificationPrefsRequest }>(
    "/settings/notifications",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const user = await app.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const currentPrefs = (user.notificationPrefs as Record<string, boolean>) || {};
      const newPrefs = { ...currentPrefs, ...request.body };

      await app.prisma.user.update({
        where: { id: userId },
        data: { notificationPrefs: newPrefs },
      });

      return reply.send({ notificationPrefs: newPrefs });
    },
  );

  // Export account data
  app.post("/settings/account/export", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workflows: { include: { template: { select: { name: true } } } },
        credentials: { select: { id: true, serviceType: true, name: true, createdAt: true } },
        subscription: true,
      },
    });

    if (!user) return reply.status(404).send({ error: "User not found" });

    await createAuditLog({
      userId,
      action: "account_exported",
      resourceType: "user",
      resourceId: userId,
      ipAddress: request.ip,
    });

    return reply.send({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      workflows: user.workflows,
      credentials: user.credentials,
      subscription: user.subscription,
      exportedAt: new Date().toISOString(),
    });
  });

  // Delete account (soft delete with full cleanup)
  app.delete("/settings/account", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const { removeTrigger } = await import("../services/trigger.service.js");

    // 1. Pause all workflows and remove cron triggers
    const workflows = await app.prisma.userWorkflow.findMany({
      where: { userId },
      include: { template: { select: { triggerType: true } } },
    });

    for (const wf of workflows) {
      const triggerConfig = wf.triggerConfig as { type?: string } | null;
      const triggerType = triggerConfig?.type || wf.template.triggerType;
      await removeTrigger(wf.id, triggerType);
    }

    await app.prisma.userWorkflow.updateMany({
      where: { userId },
      data: { status: "paused" },
    });

    // 2. Revoke all sessions
    await app.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 3. Cancel Stripe subscription if exists
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (user?.subscription?.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
      } catch {
        // Non-critical: Stripe will handle expiration
      }
    }

    // 4. Soft delete user
    await app.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId,
      action: "account_deleted",
      resourceType: "user",
      resourceId: userId,
      ipAddress: request.ip,
    });

    return reply.send({ message: "Account scheduled for deletion" });
  });

  // API Keys
  app.get("/settings/api-keys", { preHandler: [authenticate] }, async (request, reply) => {
    const { getUserApiKeys } = await import("../services/api-key.service.js");
    const keys = await getUserApiKeys(request.user.userId);
    return reply.send(keys);
  });

  app.post<{ Body: { name: string; scopes?: string[]; expiresAt?: string } }>(
    "/settings/api-keys",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { createApiKey } = await import("../services/api-key.service.js");
      const result = await createApiKey(request.user.userId, request.body);

      await createAuditLog({
        userId: request.user.userId,
        action: "api_key_created",
        resourceType: "api_key",
        resourceId: result.id,
        ipAddress: request.ip,
      });

      return reply.status(201).send(result);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/settings/api-keys/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { deleteApiKey } = await import("../services/api-key.service.js");
      await deleteApiKey(request.user.userId, request.params.id);

      await createAuditLog({
        userId: request.user.userId,
        action: "api_key_deleted",
        resourceType: "api_key",
        resourceId: request.params.id,
        ipAddress: request.ip,
      });

      return reply.status(204).send();
    },
  );

  // Referral
  app.get("/settings/referral", { preHandler: [authenticate] }, async (request, reply) => {
    const { getUserReferrals } = await import("../services/referral.service.js");
    const result = await getUserReferrals(request.user.userId);
    return reply.send(result);
  });

  // Session management moved to routes/sessions.ts
}
