import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@autoact/db";

const prisma = new PrismaClient();
const QUEUE_NAME = "dead-letter";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

let dlqQueue: Queue | null = null;

export function getDLQQueue(): Queue {
  if (!dlqQueue) {
    dlqQueue = new Queue(QUEUE_NAME, { connection });
  }
  return dlqQueue;
}

export async function startDLQWorker(): Promise<void> {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { originalQueue, originalJobId, error, data, failedAt } = job.data;

      console.error(`[dlq] Processing dead letter from ${originalQueue}:`, {
        originalJobId,
        error,
        failedAt,
      });

      // Create audit log entry for failed job
      await prisma.auditLog.create({
        data: {
          action: "dlq_processed",
          resourceType: "job",
          resourceId: originalJobId,
          newValue: { originalQueue, error, failedAt, data },
        },
      });
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`[dlq-worker] Job ${job?.id} failed:`, err.message);
  });

  console.log("[dlq-worker] Started — processing dead letter queue");
}
