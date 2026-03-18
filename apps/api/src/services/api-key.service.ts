import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@autoact/db";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(userId: string, params: { name: string; scopes?: string[]; expiresAt?: string }) {
  const rawKey = `ak_${randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10);

  const apiKey = await prisma.userApiKey.create({
    data: {
      userId,
      name: params.name,
      keyHash,
      keyPrefix,
      scopes: params.scopes ?? [],
      expiresAt: params.expiresAt ? new Date(params.expiresAt) : null,
    },
  });

  return { id: apiKey.id, key: rawKey, name: apiKey.name, keyPrefix, scopes: apiKey.scopes, expiresAt: apiKey.expiresAt?.toISOString(), createdAt: apiKey.createdAt.toISOString() };
}

export async function getUserApiKeys(userId: string) {
  return prisma.userApiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, scopes: true, expiresAt: true, lastUsedAt: true, createdAt: true },
  });
}

export async function deleteApiKey(userId: string, keyId: string) {
  return prisma.userApiKey.deleteMany({ where: { id: keyId, userId } });
}

export async function validateApiKey(rawKey: string) {
  const keyHash = hashKey(rawKey);
  const apiKey = await prisma.userApiKey.findFirst({ where: { keyHash } });
  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  await prisma.userApiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return apiKey;
}
