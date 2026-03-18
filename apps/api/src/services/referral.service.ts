import { randomBytes } from "node:crypto";
import { prisma } from "@autoact/db";

export async function generateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referral.findFirst({
    where: { referrerId: userId, referredId: null },
  });
  if (existing) return existing.code;

  const code = randomBytes(4).toString("hex").toUpperCase();
  await prisma.referral.create({
    data: { referrerId: userId, code },
  });
  return code;
}

export async function applyReferralCode(referredUserId: string, code: string): Promise<boolean> {
  const referral = await prisma.referral.findUnique({ where: { code } });
  if (!referral || referral.referredId || referral.referrerId === referredUserId) return false;

  await prisma.referral.update({
    where: { id: referral.id },
    data: { referredId: referredUserId },
  });
  return true;
}

export async function getUserReferrals(userId: string) {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
  });
  const code = await generateReferralCode(userId);
  return { code, referrals };
}
