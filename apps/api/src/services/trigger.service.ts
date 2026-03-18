import { getWorkflowQueue } from "../utils/queue.js";

export async function setupTrigger(
  workflowId: string,
  triggerType: string,
  triggerConfig?: { type: string; cron?: string }
): Promise<void> {
  if (triggerType === "cron" && triggerConfig?.cron) {
    const queue = getWorkflowQueue();
    await queue.add(
      "execute-workflow",
      { userWorkflowId: workflowId },
      {
        repeat: {
          pattern: triggerConfig.cron,
        },
        jobId: `cron-${workflowId}`,
      }
    );
  }
  // webhook: handled by dynamic route /webhooks/:workflowId (already exists)
  // manual: no trigger setup needed
}

export async function pauseTrigger(
  workflowId: string,
  triggerType: string
): Promise<void> {
  if (triggerType === "cron") {
    const queue = getWorkflowQueue();
    const repeatableJobs = await queue.getRepeatableJobs();
    const job = repeatableJobs.find((j) => j.id === `cron-${workflowId}`);
    if (job) {
      await queue.removeRepeatableByKey(job.key);
    }
  }
}

export async function resumeTrigger(
  workflowId: string,
  triggerType: string,
  triggerConfig?: { type: string; cron?: string }
): Promise<void> {
  if (triggerType === "cron" && triggerConfig?.cron) {
    await setupTrigger(workflowId, triggerType, triggerConfig);
  }
}

export async function removeTrigger(
  workflowId: string,
  triggerType: string
): Promise<void> {
  if (triggerType === "cron") {
    await pauseTrigger(workflowId, triggerType);
  }
}
