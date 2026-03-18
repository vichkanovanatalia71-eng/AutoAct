import { prisma } from "@autoact/db";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
}) {
  return prisma.notification.create({ data: params as any });
}

export async function getUserNotifications(userId: string, params?: { page?: number; pageSize?: number; unreadOnly?: boolean }) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const where: Record<string, unknown> = { userId };
  if (params?.unreadOnly) where.readAt = null;

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { data, total, unreadCount, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
