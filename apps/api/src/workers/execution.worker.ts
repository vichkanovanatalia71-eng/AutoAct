import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@autoact/db";
import { GraphExecutor } from "@autoact/engine";
import type { WorkflowDefinition } from "@autoact/types";

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
        },
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const definition = (jobData.definition || workflow.template.definition) as WorkflowDefinition;
    const credentialMapping = (jobData.credentialMapping || workflow.credentialMapping) as Record<string, string>;

    // Build credentials map
    const credentials: Record<string, Record<string, string>> = {};
    for (const [service, credId] of Object.entries(credentialMapping)) {
      if (typeof credId === "string") {
        const cred = workflow.user.credentials.find((c) => c.id === credId);
        if (cred) {
          // Decrypt credential (simplified - in real app would use crypto utils)
          try {
            credentials[service] = JSON.parse(cred.encryptedData);
          } catch {
            credentials[service] = { key: cred.encryptedData };
          }
        }
      } else if (typeof credId === "object" && credId !== null) {
        // System key mapping
        const mapping = credId as { type: string; service?: string };
        if (mapping.type === "system_key" && mapping.service) {
          credentials[service] = { __system_key: "true", service: mapping.service };
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
          input: null,
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
