import { Queue } from "bullmq";

let workflowQueue: Queue | null = null;

export function getWorkflowQueue(): Queue {
  if (!workflowQueue) {
    workflowQueue = new Queue("workflow-executions", {
      connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
    });
  }
  return workflowQueue;
}
