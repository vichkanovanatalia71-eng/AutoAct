import type { PrismaClient } from "@autoact/db";
import type { CredentialMappingEntry } from "@autoact/types";
import { randomBytes } from "node:crypto";
import { checkWorkflowLimit } from "../utils/limits.js";
import { getWorkflowQueue } from "../utils/queue.js";
import { setupTrigger } from "./trigger.service.js";

export interface ActivationPreviewResult {
  templateId: string;
  templateName: string;
  triggerType: string;
  credentials: Array<{
    service: string;
    status: "matched" | "missing";
    credentialId?: string;
    credentialName?: string;
    systemKey?: {
      displayName: string;
      pricePerExecution: number;
    };
  }>;
}

export async function getActivationPreview(
  userId: string,
  templateId: string,
  prisma: PrismaClient
): Promise<ActivationPreviewResult> {
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    const error = new Error("Template not found");
    (error as any).statusCode = 404;
    throw error;
  }

  const userCredentials = await prisma.credential.findMany({
    where: { userId },
  });

  const platformKeys = await prisma.platformApiKey.findMany({
    where: { isActive: true },
  });

  const credentials = template.requiredCredentials.map((service) => {
    const userCred = userCredentials.find(
      (c) => c.serviceType.toLowerCase() === service.toLowerCase()
    );

    const systemKey = platformKeys.find(
      (k) => k.serviceType.toLowerCase() === service.toLowerCase()
    );

    if (userCred) {
      return {
        service,
        status: "matched" as const,
        credentialId: userCred.id,
        credentialName: userCred.name,
        systemKey: systemKey
          ? {
              displayName: systemKey.displayName,
              pricePerExecution: Number(systemKey.pricePerExecution),
            }
          : undefined,
      };
    }

    return {
      service,
      status: "missing" as const,
      systemKey: systemKey
        ? {
            displayName: systemKey.displayName,
            pricePerExecution: Number(systemKey.pricePerExecution),
          }
        : undefined,
    };
  });

  return {
    templateId: template.id,
    templateName: template.name,
    triggerType: template.triggerType,
    credentials,
  };
}

export interface ActivateWorkflowParams {
  userId: string;
  templateId: string;
  credentialMapping: Record<string, CredentialMappingEntry>;
  triggerConfig?: { type: string; cron?: string };
}

export async function activateWorkflow(
  params: ActivateWorkflowParams,
  prisma: PrismaClient
) {
  const { userId, templateId, credentialMapping, triggerConfig } = params;

  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    const error = new Error("Template not found");
    (error as any).statusCode = 404;
    throw error;
  }

  // Check plan limits
  await checkWorkflowLimit(userId, prisma);

  // Validate that all required credentials are covered
  for (const service of template.requiredCredentials) {
    const mapping = credentialMapping[service];
    if (!mapping) {
      const error = new Error(`Missing credential mapping for service: ${service}`);
      (error as any).statusCode = 400;
      throw error;
    }

    if (mapping.type === "user_credential" && !mapping.credential_id) {
      const error = new Error(`Missing credential_id for service: ${service}`);
      (error as any).statusCode = 400;
      throw error;
    }

    // Validate user_credential exists and belongs to user
    if (mapping.type === "user_credential" && mapping.credential_id) {
      const cred = await prisma.credential.findUnique({
        where: { id: mapping.credential_id },
      });
      if (!cred || cred.userId !== userId) {
        const error = new Error(`Invalid credential for service: ${service}`);
        (error as any).statusCode = 400;
        throw error;
      }
    }

    // Validate system_key exists and is active
    if (mapping.type === "system_key") {
      const key = await prisma.platformApiKey.findFirst({
        where: {
          serviceType: { equals: mapping.service || service, mode: "insensitive" },
          isActive: true,
        },
      });
      if (!key) {
        const error = new Error(`System key not available for service: ${service}`);
        (error as any).statusCode = 400;
        throw error;
      }
    }
  }

  // Determine trigger type
  const effectiveTriggerType = triggerConfig?.type || template.triggerType;

  // Generate webhook secret for signature verification
  const webhookSecret = randomBytes(32).toString("hex");

  // Create UserWorkflow
  const workflow = await prisma.userWorkflow.create({
    data: {
      userId,
      templateId,
      status: "pending",
      credentialMapping: credentialMapping as any,
      triggerConfig: triggerConfig
        ? (triggerConfig as any)
        : { type: effectiveTriggerType },
      templateVersion: template.version,
      webhookSecret,
    },
  });

  // Increment template activations count
  await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: { activationsCount: { increment: 1 } },
  });

  // Setup trigger (cron repeatable job, webhook is automatic)
  await setupTrigger(workflow.id, effectiveTriggerType, triggerConfig);

  // Create test execution and enqueue
  const execution = await prisma.execution.create({
    data: {
      userWorkflowId: workflow.id,
      status: "pending",
      isTest: true,
    },
  });

  // Update workflow status to testing
  await prisma.userWorkflow.update({
    where: { id: workflow.id },
    data: { status: "testing" },
  });

  // Enqueue test execution job
  const queue = getWorkflowQueue();
  await queue.add("execute-workflow", {
    userWorkflowId: workflow.id,
    executionId: execution.id,
    isTest: true,
  });

  // Build webhook URL if applicable
  const apiUrl = process.env.API_BASE_URL || process.env.FRONTEND_URL?.replace(":3000", ":3001") || "http://localhost:3001";
  const webhookUrl = effectiveTriggerType === "webhook"
    ? `${apiUrl}/webhooks/${workflow.id}`
    : undefined;

  return {
    id: workflow.id,
    templateId: workflow.templateId,
    templateName: template.name,
    status: workflow.status,
    triggerType: effectiveTriggerType,
    webhookUrl,
    testExecutionId: execution.id,
    createdAt: workflow.createdAt.toISOString(),
  };
}
