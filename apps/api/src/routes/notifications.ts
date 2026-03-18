import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notification.service.js";

export async function notificationRoutes(app: FastifyInstance) {
  // List notifications
  app.get<{
    Querystring: { page?: string; pageSize?: string; unreadOnly?: string };
  }>("/notifications", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    const page = parseInt(request.query.page || "1", 10);
    const pageSize = parseInt(request.query.pageSize || "20", 10);
    const unreadOnly = request.query.unreadOnly === "true";

    const result = await getUserNotifications(userId, { page, pageSize, unreadOnly });
    return reply.send({
      data: result.data.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  });

  // Mark single notification as read
  app.patch<{ Params: { id: string } }>(
    "/notifications/:id/read",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      await markNotificationRead(request.params.id, userId);
      return reply.send({ message: "Marked as read" });
    },
  );

  // Mark all notifications as read
  app.patch("/notifications/read-all", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;
    await markAllNotificationsRead(userId);
    return reply.send({ message: "All notifications marked as read" });
  });
}
