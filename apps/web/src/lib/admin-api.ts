const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function adminFetch<T = unknown>(
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
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

// ---------- Admin Templates ----------

export interface AdminTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  triggerType: string;
  requiredCredentials: string[];
  nodes: Array<{ id: string; type: string; label: string; config?: Record<string, unknown> }>;
  jsonUrl?: string;
  jsonDefinition?: Record<string, unknown>;
  syncStatus: "idle" | "syncing" | "error";
  syncError?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTemplatesResponse {
  data: AdminTemplate[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getAdminTemplates(params?: Record<string, string>) {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
  }
  const qs = query.toString();
  return adminFetch<AdminTemplatesResponse>(`/admin/templates${qs ? `?${qs}` : ""}`);
}

export async function getAdminTemplate(id: string) {
  return adminFetch<AdminTemplate>(`/admin/templates/${id}`);
}

export async function createAdminTemplate(data: {
  name: string;
  description: string;
  category: string;
  tags: string[];
  jsonUrl?: string;
  jsonDefinition?: Record<string, unknown>;
}) {
  return adminFetch<AdminTemplate>("/admin/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    jsonUrl?: string;
    jsonDefinition?: Record<string, unknown>;
  }
) {
  return adminFetch<AdminTemplate>(`/admin/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminTemplate(id: string) {
  return adminFetch(`/admin/templates/${id}`, { method: "DELETE" });
}

export async function syncTemplate(id: string) {
  return adminFetch<{ success: boolean; changes?: SyncChanges; error?: string }>(
    `/admin/templates/${id}/sync`,
    { method: "POST" }
  );
}

export interface PreviewResult {
  nodes: Array<{ id: string; type: string; label: string }>;
  requiredCredentials: string[];
  triggerType: string;
}

export async function previewTemplateUrl(url: string) {
  return adminFetch<PreviewResult>("/admin/templates/preview-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

// ---------- Sync Logs ----------

export interface SyncChanges {
  nodesAdded?: string[];
  nodesRemoved?: string[];
  credentialsAdded?: string[];
  credentialsRemoved?: string[];
}

export interface SyncLog {
  id: string;
  templateId: string;
  templateName: string;
  status: "success" | "error" | "no_change";
  changes?: SyncChanges;
  error?: string;
  createdAt: string;
}

export interface SyncLogsResponse {
  data: SyncLog[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getSyncLogs(params?: Record<string, string>) {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
  }
  const qs = query.toString();
  return adminFetch<SyncLogsResponse>(`/admin/sync-logs${qs ? `?${qs}` : ""}`);
}

// ---------- Settings ----------

export interface AdminSettings {
  syncIntervalMinutes: number;
}

export async function getAdminSettings() {
  return adminFetch<AdminSettings>("/admin/settings");
}

export async function updateAdminSettings(data: Partial<AdminSettings>) {
  return adminFetch<AdminSettings>("/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
