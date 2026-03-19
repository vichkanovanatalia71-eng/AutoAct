import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@autoact/db";
import { GraphExecutor } from "@autoact/engine";
import type { WorkflowDefinition } from "@autoact/types";
import { deriveKey, decrypt } from "../utils/crypto.js";
import { checkExecutionLimit } from "../utils/limits.js";
import { getNotifyQueue } from "./notify.worker.js";

const prisma = new PrismaClient();
const QUEUE_NAME = "workflow-executions";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

async function processExecution(jobData: {
  executionId: string;
  workflowId?: string;
  userWorkflowId?: string;
  templateId?: string;
  definition?: unknown;
  credentialMapping?: unknown;
  triggerPayload?: unknown;
  isTest?: boolean;
}): Promise<void> {
  const { executionId } = jobData;
  const wfId = jobData.userWorkflowId || jobData.workflowId;

  // Check execution limits for non-test executions
  if (!jobData.isTest && wfId) {
    const workflow = await prisma.userWorkflow.findUnique({
      where: { id: wfId },
      select: { userId: true, status: true },
    });

    if (!workflow) {
      await prisma.execution.update({
        where: { id: executionId },
        data: { status: "failed", errorMessage: "Workflow not found", finishedAt: new Date() },
      });
      return;
    }

    // Skip execution if workflow is paused
    if (workflow.status === "paused") {
      await prisma.execution.update({
        where: { id: executionId },
        data: { status: "failed", errorMessage: "Workflow is paused", finishedAt: new Date() },
      });
      return;
    }

    try {
      await checkExecutionLimit(workflow.userId, prisma);
    } catch (limitErr: any) {
      await prisma.execution.update({
        where: { id: executionId },
        data: { status: "failed", errorMessage: limitErr.message, finishedAt: new Date() },
      });
      return;
    }
  }

  // Update execution to running
  await prisma.execution.update({
    where: { id: executionId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    // Get workflow + template + credentials
    const workflow = await prisma.userWorkflow.findUnique({
      where: { id: wfId! },
      include: {
        template: true,
        user: {
          include: { credentials: true },
          select: { id: true, salt: true, credentials: true },
        },
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const definition = (jobData.definition || workflow.template.definition) as WorkflowDefinition;
    const credentialMapping = (jobData.credentialMapping || workflow.credentialMapping) as Record<string, string>;

    // Build credentials map with proper decryption
    const credentials: Record<string, Record<string, string>> = {};
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    const systemKeyServices: string[] = [];

    for (const [service, credId] of Object.entries(credentialMapping)) {
      if (typeof credId === "string") {
        const cred = workflow.user.credentials.find((c) => c.id === credId);
        if (cred) {
          // Decrypt credential using crypto utils
          if (masterKey && cred.iv) {
            try {
              const key = deriveKey(masterKey, workflow.user.salt);
              const decrypted = decrypt(cred.encryptedData, cred.iv, key);
              credentials[service] = JSON.parse(decrypted);
            } catch {
              throw new Error(`Failed to decrypt credentials for service: ${service}`);
            }
          } else {
            // Fallback for unencrypted legacy data
            try {
              credentials[service] = JSON.parse(cred.encryptedData);
            } catch {
              credentials[service] = { key: cred.encryptedData };
            }
          }
        }
      } else if (typeof credId === "object" && credId !== null) {
        // System key mapping
        const mapping = credId as { type: string; service?: string };
        if (mapping.type === "system_key" && mapping.service) {
          credentials[service] = { __system_key: "true", service: mapping.service };
          systemKeyServices.push(mapping.service);
        }
      }
    }

    const startTime = Date.now();
    const executor = new GraphExecutor(definition, credentials, {
      timeoutMs: 300_000,
      maxRetries: 3,
      enableParallel: true,
    });

    const logs = await executor.execute(jobData.triggerPayload);
    const durationMs = Date.now() - startTime;
    const hasError = logs.some((l) => l.status === "error");
    const errorLog = logs.find((l) => l.status === "error");

    // Save execution logs to separate table
    for (const log of logs) {
      await prisma.executionLog.create({
        data: {
          executionId,
          nodeId: log.nodeId,
          nodeType: log.nodeType || "unknown",
          status: log.status,
          input: undefined,
          output: log.output ? JSON.parse(JSON.stringify(log.output)) : null,
          durationMs: log.duration,
          error: log.error || null,
        },
      });
    }

    // Update execution record
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: hasError ? "failed" : "success",
        logs: JSON.parse(JSON.stringify(logs)),
        durationMs,
        errorNodeId: errorLog?.nodeId || null,
        errorMessage: errorLog?.error || null,
        finishedAt: new Date(),
      },
    });

    // Update workflow stats
    await prisma.userWorkflow.update({
      where: { id: wfId! },
      data: {
        lastExecutedAt: new Date(),
        executionsCount: { increment: 1 },
        ...(hasError ? { errorCount: { increment: 1 } } : {}),
        ...(jobData.isTest ? { status: hasError ? "error" : "active" } : {}),
      },
    });

    // Log system key usage for metered billing
    if (systemKeyServices.length > 0 && !jobData.isTest) {
      for (const serviceType of systemKeyServices) {
        const platformKey = await prisma.platformApiKey.findFirst({
          where: { serviceType: { equals: serviceType, mode: "insensitive" }, isActive: true },
        });
        if (platformKey) {
          await prisma.systemKeyUsageLog.create({
            data: {
              userId: workflow.userId,
              executionId,
              serviceType,
              cost: platformKey.pricePerExecution,
            },
          });
        }
      }
    }

    // Send notification for non-test executions
    if (!jobData.isTest) {
      try {
        const notifyQueue = getNotifyQueue();
        await notifyQueue.add("notification", {
          userId: workflow.userId,
          type: hasError ? "execution_failed" : "execution_success",
          title: hasError ? "Workflow execution failed" : "Workflow executed successfully",
          body: hasError
            ? `Workflow "${workflow.template.name}" failed: ${errorLog?.error || "Unknown error"}`
            : `Workflow "${workflow.template.name}" completed in ${durationMs}ms`,
          data: { executionId, workflowId: wfId },
        });
      } catch {
        // Non-critical: don't fail execution if notification fails
      }
    }

  } catch (err: any) {
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "failed",
        errorMessage: err.message,
        finishedAt: new Date(),
      },
    });

    // Update workflow error count
    if (wfId) {
      await prisma.userWorkflow.update({
        where: { id: wfId },
        data: {
          errorCount: { increment: 1 },
          ...(jobData.isTest ? { status: "error" } : {}),
        },
      });
    }
  }
}

export async function startExecutionWorker(): Promise<void> {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await processExecution(job.data);
    },
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[execution-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[execution-worker] Job ${job?.id} completed`);
  });

  console.log("[execution-worker] Started — processing workflow executions");
}
