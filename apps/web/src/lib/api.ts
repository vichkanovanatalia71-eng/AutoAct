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
    throw new Error(body.error || body.message || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---------- Auth ----------

export async function login(email: string, password: string, twoFactorCode?: string) {
  return apiFetch<{ token: string; user: { id: string; email: string; plan: string }; twoFactorRequired?: boolean }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password, twoFactorCode }) }
  );
}

export async function register(email: string, password: string, referralCode?: string) {
  return apiFetch<{ token: string; user: { id: string; email: string; plan: string } }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify({ email, password, referralCode }) }
  );
}

export async function logout() {
  return apiFetch("/auth/logout", { method: "POST" });
}

export async function refreshToken() {
  return apiFetch<{ token: string }>("/auth/refresh", { method: "POST" });
}

export async function forgotPassword(email: string) {
  return apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function verifyEmail(token: string) {
  return apiFetch<{ message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function sendVerification() {
  return apiFetch<{ message: string }>("/auth/send-verification", { method: "POST" });
}

// 2FA
export async function setup2FA() {
  return apiFetch<{ secret: string; qrCodeUrl: string }>("/auth/2fa/setup", { method: "POST" });
}

export async function verify2FA(code: string) {
  return apiFetch<{ message: string }>("/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disable2FA(code: string) {
  return apiFetch<{ message: string }>("/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
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
      nodeCount: number;
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
    definition: unknown;
    createdAt: string;
  }>(`/templates/${id}`);
}

// ---------- Reviews ----------

export async function createReview(templateId: string, rating: number, comment?: string) {
  return apiFetch<{ id: string }>(`/templates/${templateId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}

export async function getReviews(templateId: string, page?: number) {
  const qs = page ? `?page=${page}` : "";
  return apiFetch<{
    data: Array<{ id: string; userId: string; userEmail: string; rating: number; comment?: string; createdAt: string }>;
    averageRating: number;
    total: number;
    page: number;
    totalPages: number;
  }>(`/templates/${templateId}/reviews${qs}`);
}

// ---------- Workflows ----------

export async function getWorkflows() {
  return apiFetch<
    Array<{
      id: string;
      templateName: string;
      status: string;
      templateId: string;
      lastExecution?: string;
      executionCount: number;
      createdAt: string;
      needsReconfiguration?: boolean;
    }>
  >("/workflows");
}

export async function createWorkflow(data: {
  templateId: string;
  credentialMapping: Record<string, string>;
  triggerConfig?: Record<string, unknown>;
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
    needsReconfiguration?: boolean;
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

// ---------- Credentials ----------

export async function getCredentials() {
  return apiFetch<
    Array<{
      id: string;
      name: string;
      serviceType: string;
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

export async function getExecutions(params?: { workflowId?: string; page?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.workflowId) query.set("workflowId", params.workflowId);
  if (params?.page) query.set("page", params.page);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();

  return apiFetch<{
    data: Array<{
      id: string;
      workflowId: string;
      workflowName?: string;
      status: string;
      isTest: boolean;
      durationMs?: number;
      errorMessage?: string;
      startedAt: string;
      finishedAt?: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/executions${qs ? `?${qs}` : ""}`);
}

export async function getExecution(id: string) {
  return apiFetch<{
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    isTest: boolean;
    durationMs?: number;
    triggerType?: string;
    errorNodeId?: string;
    errorMessage?: string;
    logs: unknown[];
    startedAt: string;
    finishedAt?: string;
  }>(`/executions/${id}`);
}

export async function getExecutionLogs(executionId: string) {
  return apiFetch<{
    executionId: string;
    logs: Array<{
      id: string;
      nodeId: string;
      nodeType: string;
      status: string;
      input?: unknown;
      output?: unknown;
      durationMs?: number;
      error?: string;
      startedAt: string;
    }>;
  }>(`/executions/${executionId}/logs`);
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

// ---------- Billing ----------

export async function getUsage() {
  return apiFetch<{
    plan: string;
    status: string;
    executionsUsed: number;
    executionsLimit: number;
    workflowsUsed: number;
    workflowsLimit: number;
    systemKeyCostCents: number;
    periodEnd?: string;
  }>("/billing/usage");
}

export async function changePlan(plan: string) {
  return apiFetch<{ url?: string; checkoutUrl?: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function getBillingPortal() {
  return apiFetch<{ url: string }>("/billing/portal", { method: "POST" });
}

// ---------- Settings ----------

export async function updateProfile(data: { email?: string }) {
  return apiFetch<{ id: string; email: string }>("/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>("/settings/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateNotificationPrefs(prefs: { email?: boolean; inApp?: boolean }) {
  return apiFetch<{ notificationPrefs: Record<string, boolean> }>("/settings/notifications", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
}

export async function exportAccount() {
  return apiFetch<unknown>("/settings/account/export", { method: "POST" });
}

export async function deleteAccount() {
  return apiFetch<{ message: string }>("/settings/account", { method: "DELETE" });
}

// API Keys
export async function getApiKeys() {
  return apiFetch<
    Array<{
      id: string;
      name: string;
      keyPrefix: string;
      scopes: string[];
      expiresAt?: string;
      lastUsedAt?: string;
      createdAt: string;
    }>
  >("/settings/api-keys");
}

export async function createApiKey(data: { name: string; scopes?: string[]; expiresAt?: string }) {
  return apiFetch<{
    id: string;
    key: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    expiresAt?: string;
    createdAt: string;
  }>("/settings/api-keys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteApiKey(id: string) {
  return apiFetch(`/settings/api-keys/${id}`, { method: "DELETE" });
}

// Referral
export async function getReferralInfo() {
  return apiFetch<{
    code: string;
    referrals: Array<{
      id: string;
      referredId?: string;
      rewardGranted: boolean;
      createdAt: string;
    }>;
  }>("/settings/referral");
}

// ---------- Dashboard ----------

export async function getDashboard() {
  return apiFetch<{
    user: { email: string; plan: string };
    planRenewalDate?: string;
    usage: {
      executionsUsed: number;
      executionsLimit: number;
      workflowsUsed: number;
      workflowsLimit: number;
      systemKeyCostCents: number;
    };
    stats: {
      activeWorkflows: number;
      executionsToday: number;
      systemKeyCost: number;
    };
    needsAttention: Array<{
      workflowId: string;
      workflowName: string;
      reason: string;
    }>;
    recentActivity: Array<{
      id: string;
      workflowName: string;
      status: string;
      duration?: number;
      triggerType: string;
      startedAt: string;
      finishedAt?: string;
    }>;
  }>("/dashboard");
}

// ---------- Billing History ----------

export async function getBillingHistory(page?: number) {
  const qs = page ? `?page=${page}` : "";
  return apiFetch<{
    data: Array<{
      id: string;
      date: string;
      amount: number;
      status: string;
      description: string;
      invoiceUrl?: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/billing/history${qs}`);
}

// ---------- Sessions ----------

export async function getSessions() {
  return apiFetch<
    Array<{
      id: string;
      device: string;
      ip: string;
      location?: string;
      lastActive: string;
      current: boolean;
    }>
  >("/settings/sessions");
}

export async function revokeSession(id: string) {
  return apiFetch(`/settings/sessions/${id}`, { method: "DELETE" });
}

export async function revokeOtherSessions() {
  return apiFetch("/settings/sessions/revoke-others", { method: "POST" });
}

export async function updateProfileExtended(data: { email?: string; timezone?: string; language?: string }) {
  return apiFetch<{ id: string; email: string; timezone?: string; language?: string }>("/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ---------- Notifications ----------

export async function getNotifications(params?: { page?: number; unreadOnly?: boolean }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.unreadOnly) query.set("unreadOnly", "true");
  const qs = query.toString();
  return apiFetch<{
    data: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      readAt?: string;
      createdAt: string;
    }>;
    total: number;
    unreadCount: number;
    page: number;
    totalPages: number;
  }>(`/notifications${qs ? `?${qs}` : ""}`);
}

export async function markNotificationRead(id: string) {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return apiFetch("/notifications/read-all", { method: "PATCH" });
}
