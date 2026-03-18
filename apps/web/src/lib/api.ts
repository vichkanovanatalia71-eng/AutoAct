const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("autoact_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ---------- Auth ----------

export async function login(email: string, password: string) {
  return apiFetch<{ token: string; user: { id: string; email: string; plan: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
}

export async function register(email: string, password: string) {
  return apiFetch<{ token: string; user: { id: string; email: string; plan: string } }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
}

// ---------- Templates ----------

export async function getTemplates(params?: Record<string, string>) {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
  }
  const qs = query.toString();
  return apiFetch<{
    data: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      tags: string[];
      triggerType: string;
      requiredCredentials: string[];
      nodes: Array<{ id: string; type: string; label: string }>;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/templates${qs ? `?${qs}` : ""}`);
}

export async function getTemplate(id: string) {
  return apiFetch<{
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    triggerType: string;
    requiredCredentials: string[];
    nodes: Array<{ id: string; type: string; label: string; config?: Record<string, unknown> }>;
  }>(`/templates/${id}`);
}

// ---------- Workflows ----------

export async function getWorkflows() {
  return apiFetch<
    Array<{
      id: string;
      name: string;
      status: string;
      templateId: string;
      lastExecution?: string;
      executionCount: number;
      createdAt: string;
    }>
  >("/workflows");
}

export async function createWorkflow(data: {
  templateId: string;
  name: string;
  credentialMapping: Record<string, string>;
}) {
  return apiFetch<{ id: string }>("/workflows", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getWorkflow(id: string) {
  return apiFetch<{
    id: string;
    name: string;
    status: string;
    templateId: string;
    templateName: string;
    triggerConfig: Record<string, unknown>;
    credentialMapping: Record<string, string>;
    lastExecution?: string;
    executionCount: number;
    createdAt: string;
  }>(`/workflows/${id}`);
}

export async function updateWorkflowStatus(id: string, status: "active" | "paused") {
  return apiFetch(`/workflows/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteWorkflow(id: string) {
  return apiFetch(`/workflows/${id}`, { method: "DELETE" });
}

// ---------- Credentials ----------

export async function getCredentials() {
  return apiFetch<
    Array<{
      id: string;
      name: string;
      service: string;
      createdAt: string;
    }>
  >("/credentials");
}

export async function createCredential(data: {
  name: string;
  serviceType: string;
  data: Record<string, string>;
}) {
  return apiFetch<{ id: string }>("/credentials", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteCredential(id: string) {
  return apiFetch(`/credentials/${id}`, { method: "DELETE" });
}

// ---------- Executions ----------

export async function getExecutions(params?: { workflow_id?: string } | string) {
  const workflowId = typeof params === "string" ? params : params?.workflow_id;
  const path = workflowId
    ? `/executions?workflow_id=${workflowId}`
    : "/executions";
  return apiFetch<
    Array<{
      id: string;
      workflowId: string;
      workflowName: string;
      status: string;
      startedAt: string;
      finishedAt?: string;
      duration?: number;
      error?: string;
    }>
  >(path);
}

// ---------- Activation ----------

export async function getActivationPreview(templateId: string) {
  return apiFetch<{
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
  }>(`/workflows/activate/preview/${templateId}`);
}

export async function activateWorkflow(data: {
  templateId: string;
  credentialMapping: Record<
    string,
    {
      type: "user_credential" | "system_key";
      credential_id?: string;
      service?: string;
      price_per_execution?: number;
    }
  >;
  triggerConfig?: { type: string; cron?: string };
}) {
  return apiFetch<{
    id: string;
    templateId: string;
    templateName: string;
    status: string;
    triggerType: string;
    webhookUrl?: string;
    testExecutionId: string;
    createdAt: string;
  }>("/workflows/activate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSystemKeys() {
  return apiFetch<
    Array<{
      id: string;
      serviceType: string;
      displayName: string;
      pricePerExecution: number;
      isActive: boolean;
    }>
  >("/system-keys");
}

export async function testWorkflow(id: string) {
  return apiFetch<{ executionId: string; status: string }>(`/workflows/${id}/test`, {
    method: "POST",
  });
}

export async function pauseWorkflow(id: string) {
  return apiFetch<{ id: string; status: string }>(`/workflows/${id}/pause`, {
    method: "POST",
  });
}

export async function resumeWorkflow(id: string) {
  return apiFetch<{ id: string; status: string }>(`/workflows/${id}/resume`, {
    method: "POST",
  });
}

// ---------- Billing ----------

export async function getUsage() {
  return apiFetch<{
    plan: string;
    executionsUsed: number;
    executionsLimit: number;
    billingPortalUrl?: string;
  }>("/billing/usage");
}

export async function changePlan(plan: string) {
  return apiFetch<{ checkoutUrl?: string }>("/billing/change-plan", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}
