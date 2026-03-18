import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes, createHash, createHmac } from "node:crypto";
import { authenticate } from "../plugins/auth.js";
import type { RegisterRequest, LoginRequest } from "@autoact/types";
import { PlanType, PLAN_LIMITS } from "@autoact/types";
import { createAuditLog } from "../services/audit.service.js";

// In-memory token store for password reset / email verification (use Redis in production)
const tokenStore = new Map<string, { userId: string; expiresAt: number; type: string }>();

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function generate2FASecret(): string {
  return randomBytes(20).toString("hex");
}

function verifyTOTP(secret: string, code: string): boolean {
  const now = Math.floor(Date.now() / 30000);
  for (let i = -1; i <= 1; i++) {
    const counter = now + i;
    const hmac = createHmac("sha1", Buffer.from(secret, "hex"));
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    hmac.update(buffer);
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0xf;
    const otp =
      (((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)) %
      1_000_000;
    if (otp.toString().padStart(6, "0") === code) {
      return true;
    }
  }
  return false;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterRequest }>("/auth/register", async (request, reply) => {
    const { email, password, referralCode } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: "Email and password are required" });
    }

    if (password.length < 8) {
      return reply.status(400).send({ error: "Password must be at least 8 characters" });
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
            workflowsLimit: PLAN_LIMITS[PlanType.FREE].workflows,
          },
        },
      },
      include: { subscription: true },
    });

    // Apply referral code if provided
    if (referralCode) {
      try {
        const { applyReferralCode } = await import("../services/referral.service.js");
        await applyReferralCode(user.id, referralCode);
      } catch {
        // Silently ignore referral errors
      }
    }

    const token = app.jwt.sign({ userId: user.id, email: user.email });

    await createAuditLog({
      userId: user.id,
      action: "user_registered",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.subscription!.plan as PlanType,
        emailVerified: false,
        twoFactorEnabled: false,
        onboardingCompleted: false,
        timezone: user.timezone,
        language: user.language,
        avatarUrl: user.avatarUrl,
        biometricEnabled: user.biometricEnabled,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  app.post<{ Body: LoginRequest }>("/auth/login", async (request, reply) => {
    const { email, password, twoFactorCode } = request.body;

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

    if (user.deletedAt) {
      return reply.status(401).send({ error: "Account has been deleted" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    // 2FA check
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        return reply.status(403).send({ error: "Two-factor code required", twoFactorRequired: true });
      }
      if (!verifyTOTP(user.twoFactorSecret, twoFactorCode)) {
        return reply.status(401).send({ error: "Invalid two-factor code" });
      }
    }

    const token = app.jwt.sign({ userId: user.id, email: user.email });

    await createAuditLog({
      userId: user.id,
      action: "user_login",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: request.ip,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: (user.subscription?.plan ?? PlanType.FREE) as PlanType,
        emailVerified: !!user.emailVerifiedAt,
        twoFactorEnabled: user.twoFactorEnabled,
        onboardingCompleted: user.onboardingCompleted,
        timezone: user.timezone,
        language: user.language,
        avatarUrl: user.avatarUrl,
        biometricEnabled: user.biometricEnabled,
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
      emailVerified: !!user.emailVerifiedAt,
      twoFactorEnabled: user.twoFactorEnabled,
      onboardingCompleted: user.onboardingCompleted,
      timezone: user.timezone,
      language: user.language,
      avatarUrl: user.avatarUrl,
      biometricEnabled: user.biometricEnabled,
      createdAt: user.createdAt.toISOString(),
      notificationPrefs: user.notificationPrefs,
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
            executionsLimit: user.subscription.executionsLimit,
            workflowsLimit: user.subscription.workflowsLimit,
            periodEnd: user.subscription.periodEnd?.toISOString() ?? null,
          }
        : null,
    });
  });

  // Logout (client-side token invalidation — server acknowledges)
  app.post("/auth/logout", { preHandler: [authenticate] }, async (request, reply) => {
    await createAuditLog({
      userId: request.user.userId,
      action: "user_logout",
      resourceType: "user",
      resourceId: request.user.userId,
      ipAddress: request.ip,
    });
    return reply.send({ message: "Logged out successfully" });
  });

  // Refresh token
  app.post("/auth/refresh", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId, email } = request.user;
    const token = app.jwt.sign({ userId, email });
    return reply.send({ token });
  });

  // Forgot password
  app.post<{ Body: { email: string } }>("/auth/forgot-password", async (request, reply) => {
    const { email } = request.body;
    if (!email) return reply.status(400).send({ error: "Email is required" });

    const user = await app.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return reply.send({ message: "If the email exists, a reset link has been sent" });

    const token = generateToken();
    tokenStore.set(token, { userId: user.id, expiresAt: Date.now() + 3600_000, type: "password_reset" });

    // In production, send email with reset link
    console.log(`[auth] Password reset token for ${email}: ${token}`);

    return reply.send({ message: "If the email exists, a reset link has been sent" });
  });

  // Reset password
  app.post<{ Body: { token: string; password: string } }>("/auth/reset-password", async (request, reply) => {
    const { token, password } = request.body;
    if (!token || !password) return reply.status(400).send({ error: "Token and password are required" });

    if (password.length < 8) return reply.status(400).send({ error: "Password must be at least 8 characters" });

    const stored = tokenStore.get(token);
    if (!stored || stored.type !== "password_reset" || Date.now() > stored.expiresAt) {
      return reply.status(400).send({ error: "Invalid or expired token" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await app.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } });
    tokenStore.delete(token);

    await createAuditLog({
      userId: stored.userId,
      action: "password_reset",
      resourceType: "user",
      resourceId: stored.userId,
      ipAddress: request.ip,
    });

    return reply.send({ message: "Password reset successfully" });
  });

  // Verify email
  app.post<{ Body: { token: string } }>("/auth/verify-email", async (request, reply) => {
    const { token } = request.body;
    if (!token) return reply.status(400).send({ error: "Token is required" });

    const stored = tokenStore.get(token);
    if (!stored || stored.type !== "email_verify" || Date.now() > stored.expiresAt) {
      return reply.status(400).send({ error: "Invalid or expired token" });
    }

    await app.prisma.user.update({
      where: { id: stored.userId },
      data: { emailVerifiedAt: new Date() },
    });
    tokenStore.delete(token);

    return reply.send({ message: "Email verified successfully" });
  });

  // Request email verification
  app.post("/auth/send-verification", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    if (user.emailVerifiedAt) return reply.send({ message: "Email already verified" });

    const token = generateToken();
    tokenStore.set(token, { userId, expiresAt: Date.now() + 86400_000, type: "email_verify" });

    console.log(`[auth] Email verification token for ${user.email}: ${token}`);

    return reply.send({ message: "Verification email sent" });
  });

  // 2FA Setup
  app.post("/auth/2fa/setup", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: "User not found" });

    if (user.twoFactorEnabled) {
      return reply.status(400).send({ error: "2FA is already enabled" });
    }

    const secret = generate2FASecret();
    await app.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    // Generate otpauth URL
    const encodedEmail = encodeURIComponent(user.email);
    const qrCodeUrl = `otpauth://totp/AutoAct:${encodedEmail}?secret=${Buffer.from(secret, "hex").toString("base32")}&issuer=AutoAct`;

    return reply.send({ secret, qrCodeUrl });
  });

  // 2FA Verify & Enable
  app.post<{ Body: { code: string } }>("/auth/2fa/verify", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const { code } = request.body;
    if (!code) return reply.status(400).send({ error: "Code is required" });

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return reply.status(400).send({ error: "2FA not set up" });

    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return reply.status(401).send({ error: "Invalid code" });
    }

    await app.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });

    await createAuditLog({
      userId,
      action: "2fa_enabled",
      resourceType: "user",
      resourceId: userId,
      ipAddress: request.ip,
    });

    return reply.send({ message: "Two-factor authentication enabled" });
  });

  // 2FA Disable
  app.post<{ Body: { code: string } }>("/auth/2fa/disable", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const { code } = request.body;
    if (!code) return reply.status(400).send({ error: "Code is required" });

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return reply.status(400).send({ error: "2FA is not enabled" });
    }

    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return reply.status(401).send({ error: "Invalid code" });
    }

    await app.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    await createAuditLog({
      userId,
      action: "2fa_disabled",
      resourceType: "user",
      resourceId: userId,
      ipAddress: request.ip,
    });

    return reply.send({ message: "Two-factor authentication disabled" });
  });
}
