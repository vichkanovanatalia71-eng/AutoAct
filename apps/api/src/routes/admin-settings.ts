import type { FastifyInstance } from "fastify";
import { authenticateAdmin } from "../plugins/admin.js";

let syncIntervalMinutes = Number(process.env.SYNC_INTERVAL_MINUTES) || 15;

export function getSyncIntervalMinutes(): number {
  return syncIntervalMinutes;
}

export async function adminSettingsRoutes(app: FastifyInstance) {
  // GET /admin/settings — Return current settings
  app.get("/admin/settings", { preHandler: [authenticateAdmin] }, async (_request, reply) => {
    return reply.send({ syncIntervalMinutes });
  });

  // PATCH /admin/settings — Update settings
  app.patch<{
    Body: { syncIntervalMinutes?: number };
  }>("/admin/settings", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { syncIntervalMinutes: newInterval } = request.body;

    if (newInterval !== undefined) {
      if (typeof newInterval !== "number" || newInterval < 1) {
        return reply.status(400).send({ error: "syncIntervalMinutes must be a positive number" });
      }
      syncIntervalMinutes = newInterval;
    }

    // Import and restart the repeatable job with the new interval
    try {
      const { restartSyncSchedule } = await import("../workers/sync.worker.js");
      await restartSyncSchedule(syncIntervalMinutes);
    } catch (err: any) {
      request.log.warn({ err }, "Failed to restart sync schedule");
    }

    return reply.send({ syncIntervalMinutes });
  });
}
