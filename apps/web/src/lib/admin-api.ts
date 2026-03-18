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

// ---------- Rich Template Management ----------

export async function createTemplateFromUrl(jsonUrl: string) {
  return adminFetch<AdminTemplate>("/admin/templates/from-url", {
    method: "POST",
    body: JSON.stringify({ jsonUrl }),
  });
}

export async function regenerateCover(id: string) {
  return adminFetch<{ coverUrl: string }>(`/admin/templates/${id}/regenerate-cover`, {
    method: "POST",
  });
}

export async function regenerateDiagram(id: string) {
  return adminFetch<{ diagramUrl: string }>(`/admin/templates/${id}/regenerate-diagram`, {
    method: "POST",
  });
}

// ---------- PDF Attachments ----------

export async function addPdfUrl(id: string, title: string, url: string) {
  return adminFetch<{ id: string; title: string; url: string }>(
    `/admin/templates/${id}/pdfs`,
    {
      method: "POST",
      body: JSON.stringify({ title, url }),
    }
  );
}

export async function removePdf(id: string, pdfId: string) {
  return adminFetch(`/admin/templates/${id}/pdfs/${pdfId}`, {
    method: "DELETE",
  });
}

// ---------- Video Attachments ----------

export async function addVideoUrl(id: string, title: string, url: string) {
  return adminFetch<{ id: string; title: string; url: string; source: string }>(
    `/admin/templates/${id}/videos`,
    {
      method: "POST",
      body: JSON.stringify({ title, url }),
    }
  );
}

export async function removeVideo(id: string, videoId: string) {
  return adminFetch(`/admin/templates/${id}/videos/${videoId}`, {
    method: "DELETE",
  });
}

// ---------- Card Layout ----------

export async function updateCardLayout(
  id: string,
  layout: Array<{ type: string; visible: boolean; order?: number }>
) {
  return adminFetch<{ cardLayout: Array<{ type: string; visible: boolean; order?: number }> }>(
    `/admin/templates/${id}/card-layout`,
    {
      method: "PUT",
      body: JSON.stringify({ layout }),
    }
  );
}

// ---------- AI Analysis ----------

export interface AnalysisReport {
  id: string;
  templateId: string;
  nodeAnalysis: Array<{
    nodeId: string;
    nodeType: string;
    externalService: string | null;
    hasNativeReplacement: boolean;
    nativeNodeId: string | null;
    confidence: number;
    reason: string;
  }>;
  optimizationSuggestions: Array<{
    id: string;
    type: string;
    description: string;
    affectedNodes: string[];
    priority: string;
  }>;
  nodesToCreate: Array<{
    suggestedId: string;
    name: string;
    replaces: string[];
    implementationApproach: string;
    packages: string[];
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
  }>;
  status: string;
  appliedAt: string | null;
  createdAt: string;
}

export async function analyzeTemplate(id: string) {
  return adminFetch<AnalysisReport>(`/admin/templates/${id}/analyze`, {
    method: "POST",
  });
}

export async function getTemplateAnalysis(id: string) {
  return adminFetch<AnalysisReport | null>(`/admin/templates/${id}/analysis`);
}

export async function applyAnalysis(
  id: string,
  data: { nodeReplacements: string[]; optimizations: string[] }
) {
  return adminFetch<{
    success: boolean;
    appliedReplacements: number;
    appliedOptimizations: number;
    newVersion: number;
  }>(`/admin/templates/${id}/analysis/apply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------- Native Node Library ----------

export interface NativeNodeSummary {
  id: string;
  nodeId: string;
  name: string;
  category: string;
  replaces: string[];
  status: string;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface NativeNodeDetail extends NativeNodeSummary {
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  configSchema: Record<string, unknown> | null;
  executorCode: string;
  testCases: any[] | null;
  updatedAt: string;
}

export interface NativeNodesResponse {
  data: NativeNodeSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getNativeNodes(params?: Record<string, string>) {
  const query = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
  }
  const qs = query.toString();
  return adminFetch<NativeNodesResponse>(
    `/admin/node-library${qs ? `?${qs}` : ""}`
  );
}

export async function getNativeNode(nodeId: string) {
  return adminFetch<NativeNodeDetail>(`/admin/node-library/${nodeId}`);
}

export async function createNativeNode(data: {
  nodeId: string;
  name: string;
  category: string;
  replaces: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  executorCode: string;
  testCases?: any[];
}) {
  return adminFetch<NativeNodeDetail>("/admin/node-library", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNativeNode(
  nodeId: string,
  data: Partial<{
    name: string;
    category: string;
    replaces: string[];
    executorCode: string;
    testCases: any[];
    status: string;
  }>
) {
  return adminFetch<NativeNodeDetail>(`/admin/node-library/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteNativeNode(nodeId: string, hard = false) {
  return adminFetch(`/admin/node-library/${nodeId}${hard ? "?hard=true" : ""}`, {
    method: "DELETE",
  });
}

export async function generateNativeNode(data: {
  suggestedId: string;
  name: string;
  replaces: string[];
  implementationApproach: string;
  packages: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}) {
  return adminFetch<NativeNodeDetail>("/admin/node-library/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function testNativeNode(nodeId: string) {
  return adminFetch<{
    passed: number;
    failed: number;
    total: number;
    errors: string[];
  }>(`/admin/node-library/${nodeId}/test`, {
    method: "POST",
  });
}

// ---------- Template Stats ----------

export interface TemplateStatsResponse {
  totalActivations: number;
  activeNow: number;
  totalExecutions: number;
  successRate: number;
  views: number;
  conversionRate: number;
}

export interface ExecutionStatsResponse {
  days: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
}

export async function getTemplateStats(id: string) {
  return adminFetch<TemplateStatsResponse>(`/admin/templates/${id}/stats`);
}

export async function getTemplateExecutionStats(id: string, period?: string) {
  const query = period ? `?period=${period}` : "";
  return adminFetch<ExecutionStatsResponse>(
    `/admin/templates/${id}/stats/executions${query}`
  );
}
