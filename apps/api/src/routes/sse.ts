import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

// In-memory SSE connection store
const executionConnections = new Map<string, Set<(data: string) => void>>();
const notificationConnections = new Map<string, Set<(data: string) => void>>();

export function broadcastExecutionEvent(userWorkflowId: string, event: { type: string; data: unknown }) {
  const connections = executionConnections.get(userWorkflowId);
  if (connections) {
    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
    for (const send of connections) {
      send(payload);
    }
  }
}

export function broadcastNotification(userId: string, notification: unknown) {
  const connections = notificationConnections.get(userId);
  if (connections) {
    const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
    for (const send of connections) {
      send(payload);
    }
  }
}

export async function sseRoutes(app: FastifyInstance) {
  // SSE for execution events
  app.get<{ Params: { userWorkflowId: string } }>(
    "/sse/executions/:userWorkflowId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { userWorkflowId } = request.params;

      // Verify ownership
      const workflow = await app.prisma.userWorkflow.findUnique({
        where: { id: userWorkflowId },
      });

      if (!workflow || workflow.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      reply.raw.write("event: connected\ndata: {}\n\n");

      const send = (data: string) => {
        reply.raw.write(data);
      };

      if (!executionConnections.has(userWorkflowId)) {
        executionConnections.set(userWorkflowId, new Set());
      }
      executionConnections.get(userWorkflowId)!.add(send);

      // Heartbeat
      const heartbeat = setInterval(() => {
        reply.raw.write(": heartbeat\n\n");
      }, 30_000);

      request.raw.on("close", () => {
        clearInterval(heartbeat);
        executionConnections.get(userWorkflowId)?.delete(send);
        if (executionConnections.get(userWorkflowId)?.size === 0) {
          executionConnections.delete(userWorkflowId);
        }
      });
    },
  );

  // SSE for notifications
  app.get("/sse/notifications", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    reply.raw.write("event: connected\ndata: {}\n\n");

    const send = (data: string) => {
      reply.raw.write(data);
    };

    if (!notificationConnections.has(userId)) {
      notificationConnections.set(userId, new Set());
    }
    notificationConnections.get(userId)!.add(send);

    const heartbeat = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 30_000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      notificationConnections.get(userId)?.delete(send);
      if (notificationConnections.get(userId)?.size === 0) {
        notificationConnections.delete(userId);
      }
    });
  });
}
