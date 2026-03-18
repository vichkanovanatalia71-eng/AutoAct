import { Worker, type Job } from "bullmq";
import { pbkdf2Sync, createDecipheriv } from "node:crypto";
import { prisma } from "@autoact/db";
import type { WorkflowDefinition } from "@autoact/types";
import { GraphExecutor } from "./executor";

interface WorkflowJobData {
  userWorkflowId: string;
  payload?: unknown;
}

const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY ?? "";

function deriveKey(masterKey: string, userSalt: string): Buffer {
  return pbkdf2Sync(masterKey, userSalt, 100_000, 32, "sha512");
}

function decrypt(encryptedData: string, iv: string, key: Buffer): string {
  const [data, authTag] = encryptedData.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function processWorkflowJob(job: Job<WorkflowJobData>): Promise<void> {
  const { userWorkflowId, payload } = job.data;

  // 1. Load UserWorkflow + Template + User credentials
  const userWorkflow = await prisma.userWorkflow.findUniqueOrThrow({
    where: { id: userWorkflowId },
    include: {
      template: true,
      user: {
        include: {
          credentials: true,
        },
      },
    },
  });

  const definition = userWorkflow.template.definition as unknown as WorkflowDefinition;
  const credentialMapping = userWorkflow.credentialMapping as Record<string, string>;

  // 2. Decrypt credentials using per-user derived key
  const derivedKey = deriveKey(MASTER_KEY, userWorkflow.user.salt);
  const decryptedCredentials: Record<string, Record<string, string>> = {};
  for (const [serviceType, credentialId] of Object.entries(credentialMapping)) {
    const credential = userWorkflow.user.credentials.find((c) => c.id === credentialId);
    if (credential) {
      const decryptedData = decrypt(credential.encryptedData, credential.iv, derivedKey);
      decryptedCredentials[serviceType] = JSON.parse(decryptedData) as Record<string, string>;
    }
  }

  // 3. Create execution record
  const execution = await prisma.execution.create({
    data: {
      userWorkflowId,
      status: "pending",
    },
  });

  try {
    // 4. Update execution status to "running"
    await prisma.execution.update({
      where: { id: execution.id },
      data: { status: "running" },
    });

    // 5. Execute workflow
    const executor = new GraphExecutor(definition, decryptedCredentials);
    const logs = await executor.execute(payload);

    // 6. Determine final status
    const hasError = logs.some((log) => log.status === "error");
    const finalStatus = hasError ? "failed" : "success";

    // 7. Save logs and update execution status
    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: finalStatus,
        logs: JSON.parse(JSON.stringify(logs)),
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Update execution as failed
    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        logs: JSON.parse(
          JSON.stringify([
            {
              nodeId: "_worker",
              status: "error",
              duration: 0,
              error: errorMessage,
            },
          ]),
        ),
        finishedAt: new Date(),
      },
    });
  }
}

export function createWorker(redisUrl: string): Worker<WorkflowJobData> {
  const worker = new Worker<WorkflowJobData>(
    "workflow-executions",
    processWorkflowJob,
    { connection: { url: redisUrl } },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  return worker;
}
