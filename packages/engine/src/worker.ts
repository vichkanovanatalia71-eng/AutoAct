import { Worker, type Job } from "bullmq";
import { pbkdf2Sync, createDecipheriv } from "node:crypto";
import { prisma } from "@autoact/db";
import type { WorkflowDefinition } from "@autoact/types";
import { GraphExecutor } from "./executor";

interface CredentialMappingEntry {
  type: "user_credential" | "system_key";
  credential_id?: string;
  service?: string;
  price_per_execution?: number;
}

interface WorkflowJobData {
  userWorkflowId: string;
  executionId?: string;
  payload?: unknown;
  isTest?: boolean;
  triggerType?: string;
  triggerPayload?: unknown;
}

const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY ?? "";
const PLATFORM_SALT = "platform-api-keys-salt";

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

function parseCredentialMapping(
  raw: unknown
): Record<string, string | CredentialMappingEntry> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, string | CredentialMappingEntry>;
}

async function processWorkflowJob(job: Job<WorkflowJobData>): Promise<void> {
  const { userWorkflowId, executionId, payload, isTest, triggerType, triggerPayload } = job.data;

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
  const rawMapping = parseCredentialMapping(userWorkflow.credentialMapping);

  // 2. Decrypt credentials - support both old and new format
  const derivedKey = deriveKey(MASTER_KEY, userWorkflow.user.salt);
  const platformKey = deriveKey(MASTER_KEY, PLATFORM_SALT);
  const decryptedCredentials: Record<string, Record<string, string>> = {};
  const systemKeysUsed: Array<{ service: string; price: number }> = [];

  for (const [serviceType, mapping] of Object.entries(rawMapping)) {
    // Old format: plain string credential ID
    if (typeof mapping === "string") {
      const credential = userWorkflow.user.credentials.find((c) => c.id === mapping);
      if (credential) {
        const decryptedData = decrypt(credential.encryptedData, credential.iv, derivedKey);
        decryptedCredentials[serviceType] = JSON.parse(decryptedData) as Record<string, string>;
      }
      continue;
    }

    // New format: { type, credential_id | service }
    if (mapping.type === "user_credential" && mapping.credential_id) {
      const credential = userWorkflow.user.credentials.find(
        (c) => c.id === mapping.credential_id
      );
      if (credential) {
        const decryptedData = decrypt(credential.encryptedData, credential.iv, derivedKey);
        decryptedCredentials[serviceType] = JSON.parse(decryptedData) as Record<string, string>;
      }
    } else if (mapping.type === "system_key") {
      // Load from platform_api_keys
      const platformApiKey = await prisma.platformApiKey.findFirst({
        where: {
          serviceType: { equals: mapping.service || serviceType, mode: "insensitive" },
          isActive: true,
        },
      });

      if (platformApiKey) {
        const decryptedData = decrypt(platformApiKey.encryptedKey, platformApiKey.iv, platformKey);
        decryptedCredentials[serviceType] = { apiKey: decryptedData };
        systemKeysUsed.push({
          service: serviceType,
          price: mapping.price_per_execution || Number(platformApiKey.pricePerExecution),
        });

        // Increment usage count
        await prisma.platformApiKey.update({
          where: { id: platformApiKey.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }
  }

  // 3. Get or create execution record
  let execution;
  if (executionId) {
    execution = await prisma.execution.findUnique({ where: { id: executionId } });
  }

  if (!execution) {
    execution = await prisma.execution.create({
      data: {
        userWorkflowId,
        status: "pending",
        isTest: isTest || false,
        triggerType: triggerType || null,
        triggerPayload: triggerPayload ? JSON.parse(JSON.stringify(triggerPayload)) : null,
      },
    });
  }

  const startTime = Date.now();

  try {
    // 4. Update execution status to "running"
    await prisma.execution.update({
      where: { id: execution.id },
      data: { status: "running", startedAt: new Date() },
    });

    // 5. Execute workflow with enhanced options
    const executor = new GraphExecutor(definition, decryptedCredentials, {
      timeoutMs: 300_000,
      maxRetries: 3,
      enableParallel: true,
      circuitBreakerThreshold: 5,
    });
    const logs = await executor.execute(payload || triggerPayload);

    const durationMs = Date.now() - startTime;

    // 6. Determine final status
    const hasError = logs.some((log) => log.status === "error");
    const finalStatus = hasError ? "failed" : "success";
    const errorLog = logs.find((log) => log.status === "error");

    // 6.5. Save execution logs to separate table
    for (const log of logs) {
      await prisma.executionLog.create({
        data: {
          executionId: execution.id,
          nodeId: log.nodeId,
          nodeType: log.nodeType || "unknown",
          status: log.status,
          output: log.output ? JSON.parse(JSON.stringify(log.output)) : null,
          durationMs: log.duration,
          error: log.error || null,
        },
      });
    }

    // 7. Save logs and update execution status
    const totalSystemKeyCost = systemKeysUsed.reduce((sum, sk) => sum + sk.price, 0);
    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: finalStatus,
        logs: JSON.parse(JSON.stringify(logs)),
        durationMs,
        errorNodeId: errorLog?.nodeId || null,
        errorMessage: errorLog?.error || null,
        systemKeysCost: totalSystemKeyCost > 0 ? totalSystemKeyCost : null,
        finishedAt: new Date(),
      },
    });

    // 8. Log system key usage (if not a test)
    if (systemKeysUsed.length > 0 && !isTest) {
      await prisma.systemKeyUsageLog.createMany({
        data: systemKeysUsed.map((sk) => ({
          userId: userWorkflow.userId,
          executionId: execution!.id,
          serviceType: sk.service,
          cost: sk.price,
        })),
      });
    }

    // 9. Update workflow stats
    await prisma.userWorkflow.update({
      where: { id: userWorkflowId },
      data: {
        lastExecutedAt: new Date(),
        executionsCount: { increment: 1 },
        ...(hasError ? { errorCount: { increment: 1 } } : {}),
        ...(isTest
          ? { status: hasError ? "needs_attention" : "active" }
          : {}),
      },
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Update execution as failed
    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        durationMs,
        errorMessage,
        logs: JSON.parse(
          JSON.stringify([
            {
              nodeId: "_worker",
              nodeType: "system",
              status: "error",
              duration: 0,
              error: errorMessage,
            },
          ]),
        ),
        finishedAt: new Date(),
      },
    });

    // If test execution failed, mark workflow
    if (isTest) {
      await prisma.userWorkflow.update({
        where: { id: userWorkflowId },
        data: {
          status: "needs_attention",
          errorCount: { increment: 1 },
        },
      });
    }
  }
}

export function createWorker(redisUrl: string): Worker<WorkflowJobData> {
  const worker = new Worker<WorkflowJobData>(
    "workflow-executions",
    processWorkflowJob,
    {
      connection: { url: redisUrl },
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  return worker;
}
