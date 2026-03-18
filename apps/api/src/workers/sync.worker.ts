import { createHash } from "node:crypto";
import { Queue, Worker } from "bullmq";
import { prisma } from "@autoact/db";
import { diffWorkflowJson } from "@autoact/engine";
import { getSyncIntervalMinutes } from "../routes/admin-settings.js";

const QUEUE_NAME = "template-sync";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

let syncQueue: Queue | null = null;

/**
 * Sync a single template by ID. Reusable by admin routes and the worker.
 */
export async function syncTemplate(templateId: string): Promise<{
  status: "no_change" | "success" | "error";
  diff?: unknown;
  affectedWorkflows?: number;
  error?: string;
}> {
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || !template.jsonUrl) {
    return { status: "error", error: "Template not found or has no JSON URL" };
  }

  // Set syncing status
  await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: { syncStatus: "syncing" },
  });

  try {
    const response = await fetch(template.jsonUrl);

    if (!response.ok) {
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      await prisma.workflowTemplate.update({
        where: { id: templateId },
        data: { syncStatus: "error", syncError: errorMessage },
      });
      await prisma.syncLog.create({
        data: { templateId, status: "error", changesSummary: { error: errorMessage } },
      });
      return { status: "error", error: errorMessage };
    }

    const body = await response.text();
    const newChecksum = createHash("sha256").update(body).digest("hex");

    // No changes
    if (newChecksum === template.jsonUrlChecksum) {
      await prisma.workflowTemplate.update({
        where: { id: templateId },
        data: { syncStatus: "idle", jsonUrlLastSyncedAt: new Date() },
      });
      await prisma.syncLog.create({
        data: { templateId, status: "no_change" },
      });
      return { status: "no_change" };
    }

    // Changes detected
    const newJson = JSON.parse(body);
    const diff = diffWorkflowJson(template.definition as Record<string, unknown>, newJson);
    const newVersion = template.version + 1;

    await prisma.workflowTemplate.update({
      where: { id: templateId },
      data: {
        definition: newJson,
        requiredCredentials: Array.isArray(newJson.required_credentials)
          ? newJson.required_credentials
          : template.requiredCredentials,
        version: newVersion,
        jsonUrlChecksum: newChecksum,
        jsonUrlLastSyncedAt: new Date(),
        syncStatus: "idle",
        syncError: null,
        ...(newJson.name ? { name: newJson.name } : {}),
        ...(newJson.description ? { description: newJson.description } : {}),
        ...(newJson.category ? { category: newJson.category } : {}),
        ...(Array.isArray(newJson.tags) ? { tags: newJson.tags } : {}),
      },
    });

    await prisma.syncLog.create({
      data: {
        templateId,
        status: "success",
        changesSummary: diff as any,
      },
    });

    // Find affected user workflows
    const affectedWorkflows = await prisma.userWorkflow.findMany({
      where: {
        templateId,
        templateVersion: { lt: newVersion },
      },
      select: { id: true },
    });

    if ((diff as any).hasBreakingChanges) {
      await prisma.userWorkflow.updateMany({
        where: {
          templateId,
          templateVersion: { lt: newVersion },
        },
        data: {
          needsReconfiguration: true,
          status: "paused",
        },
      });
    } else {
      await prisma.userWorkflow.updateMany({
        where: {
          templateId,
          templateVersion: { lt: newVersion },
        },
        data: {
          templateVersion: newVersion,
        },
      });
    }

    return {
      status: "success",
      diff,
      affectedWorkflows: affectedWorkflows.length,
    };
  } catch (err: any) {
    await prisma.workflowTemplate.update({
      where: { id: templateId },
      data: { syncStatus: "error", syncError: err.message },
    });
    return { status: "error", error: err.message };
  }
}

/**
 * Restart the repeatable sync schedule with a new interval.
 */
export async function restartSyncSchedule(intervalMinutes: number): Promise<void> {
  if (!syncQueue) return;

  // Remove existing repeatable jobs
  const repeatableJobs = await syncQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await syncQueue.removeRepeatableByKey(job.key);
  }

  // Add new repeatable job with updated interval
  await syncQueue.add(
    "sync-all-templates",
    {},
    {
      repeat: {
        every: intervalMinutes * 60 * 1000,
      },
    },
  );
}

/**
 * Start the sync worker and repeatable job schedule.
 */
export async function startSyncWorker(): Promise<void> {
  syncQueue = new Queue(QUEUE_NAME, { connection });

  // Create worker that processes sync jobs
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const templates = await prisma.workflowTemplate.findMany({
        where: { jsonUrl: { not: null } },
        select: { id: true },
      });

      for (const template of templates) {
        await syncTemplate(template.id);
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`Sync job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`Sync job ${job.id} completed`);
  });

  // Set up the repeatable job
  const intervalMinutes = getSyncIntervalMinutes();
  await syncQueue.add(
    "sync-all-templates",
    {},
    {
      repeat: {
        every: intervalMinutes * 60 * 1000,
      },
    },
  );

  console.log(`Sync worker started with ${intervalMinutes}-minute interval`);
}
