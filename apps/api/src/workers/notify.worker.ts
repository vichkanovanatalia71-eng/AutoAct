import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@autoact/db";

const prisma = new PrismaClient();
const QUEUE_NAME = "notifications";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

let notifyQueue: Queue | null = null;

export function getNotifyQueue(): Queue {
  if (!notifyQueue) {
    notifyQueue = new Queue(QUEUE_NAME, { connection });
  }
  return notifyQueue;
}

async function processNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
}): Promise<void> {
  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data ? JSON.parse(JSON.stringify(data.data)) : null,
    },
  });

  // Check user notification preferences for email
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { email: true, notificationPrefs: true },
  });

  if (user) {
    const prefs = user.notificationPrefs as { email?: boolean } | null;
    if (prefs?.email) {
      // Email notification would be sent here via email service
      console.log(`[notify] Would send email to ${user.email}: ${data.title}`);
    }
  }
}

export async function startNotifyWorker(): Promise<void> {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processNotification(job.data);
    },
    { connection, concurrency: 10 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[notify-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[notify-worker] Job ${job?.id} completed`);
  });

  console.log("[notify-worker] Started — processing notifications");
}
