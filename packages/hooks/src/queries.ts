import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import type {
  WorkflowDTO,
  ExecutionDTO,
  CredentialDTO,
  TemplateDTO,
  NotificationDTO,
  UserApiKeyDTO,
  BillingUsageDTO,
  ReferralDTO,
  PaginatedResponse,
} from "@autoact/types";

// ============ Query Keys ============

export const queryKeys = {
  currentUser: ["currentUser"] as const,
  workflows: (filters?: Record<string, string>) => ["workflows", filters] as const,
  workflow: (id: string) => ["workflow", id] as const,
  workflowExecutions: (id: string, page?: number) => ["workflowExecutions", id, page] as const,
  executions: (params?: Record<string, string>) => ["executions", params] as const,
  execution: (id: string) => ["execution", id] as const,
  credentials: ["credentials"] as const,
  templates: (params?: Record<string, string>) => ["templates", params] as const,
  template: (id: string) => ["template", id] as const,
  subscription: ["subscription"] as const,
  billingHistory: (page?: number) => ["billingHistory", page] as const,
  notifications: (params?: { page?: number; unreadOnly?: boolean }) => ["notifications", params] as const,
  systemKeys: ["systemKeys"] as const,
  userApiKeys: ["userApiKeys"] as const,
  referral: ["referral"] as const,
  favorites: ["favorites"] as const,
  dashboard: ["dashboard"] as const,
  sessions: ["sessions"] as const,
};

// ============ Dashboard ============

export interface DashboardData {
  stats: {
    activeWorkflows: number;
    executionsToday: number;
    systemKeyCost: number;
  };
  usage: BillingUsageDTO;
  alerts: Array<{
    id: string;
    workflowId: string;
    workflowName: string;
    type: string;
    message: string;
  }>;
  recentActivity: Array<{
    id: string;
    workflowName: string;
    status: string;
    durationMs?: number;
    triggerType?: string;
    startedAt: string;
    errorMessage?: string;
  }>;
}

export function useDashboard(options?: Partial<UseQueryOptions<DashboardData>>) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiFetch<DashboardData>("/dashboard"),
    staleTime: 30_000,
    ...options,
  });
}

// ============ Workflows ============

export interface WorkflowListItem {
  id: string;
  name: string;
  templateName: string;
  templateId: string;
  status: string;
  triggerType: string;
  lastExecution?: string;
  lastExecutionStatus?: string;
  lastExecutionDurationMs?: number;
  executionCount: number;
  errorCount: number;
  createdAt: string;
  needsReconfiguration?: boolean;
  description?: string;
}

export function useWorkflows(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.workflows(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters);
      const qs = params.toString();
      return apiFetch<WorkflowListItem[]>(`/workflows${qs ? `?${qs}` : ""}`);
    },
    staleTime: 30_000,
  });
}

export interface WorkflowDetail {
  id: string;
  name: string;
  status: string;
  templateId: string;
  templateName: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  credentialMapping: Record<string, unknown>;
  webhookUrl?: string;
  lastExecution?: string;
  executionCount: number;
  errorCount: number;
  successRate: number;
  avgDurationMs: number;
  topError?: { nodeId: string; message: string; count: number };
  createdAt: string;
  needsReconfiguration?: boolean;
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: queryKeys.workflow(id),
    queryFn: () => apiFetch<WorkflowDetail>(`/workflows/${id}`),
    enabled: !!id,
  });
}

export function useWorkflowExecutions(id: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.workflowExecutions(id, page),
    queryFn: () =>
      apiFetch<PaginatedResponse<ExecutionDTO>>(
        `/executions?workflowId=${id}&page=${page}`
      ),
    enabled: !!id,
  });
}

export function usePauseWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/workflows/${id}/pause`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow"] });
    },
  });
}

export function useResumeWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/workflows/${id}/resume`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow"] });
    },
  });
}

export function useRunWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ executionId: string }>(`/workflows/${id}/test`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["executions"] });
    },
  });
}

export function useActivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      templateId: string;
      credentialMapping: Record<string, unknown>;
      triggerConfig?: Record<string, unknown>;
    }) =>
      apiFetch("/workflows/activate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/workflows/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

// ============ Credentials ============

export function useCredentials() {
  return useQuery({
    queryKey: queryKeys.credentials,
    queryFn: () => apiFetch<CredentialDTO[]>("/credentials"),
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; serviceType: string; data: Record<string, string> }) =>
      apiFetch<{ id: string }>("/credentials", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.credentials });
    },
  });
}

export function useDeleteCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/credentials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.credentials });
    },
  });
}

// ============ Templates / Catalog ============

export function useTemplates(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.templates(params),
    queryFn: () => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch<PaginatedResponse<TemplateDTO>>(
        `/templates${qs ? `?${qs}` : ""}`
      );
    },
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.template(id),
    queryFn: () => apiFetch<TemplateDTO & { definition: unknown }>(`/templates/${id}`),
    enabled: !!id,
  });
}

// ============ Subscription / Billing ============

export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => apiFetch<BillingUsageDTO>("/billing/usage"),
  });
}

export interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "failed" | "pending";
  invoiceUrl?: string;
  description: string;
}

export function useBillingHistory(page = 1) {
  return useQuery({
    queryKey: queryKeys.billingHistory(page),
    queryFn: () =>
      apiFetch<PaginatedResponse<BillingHistoryItem>>(
        `/billing/history?page=${page}`
      ),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan: string) =>
      apiFetch<{ url?: string; checkoutUrl?: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.subscription });
    },
  });
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ url: string }>("/billing/portal", { method: "POST" }),
  });
}

// ============ Notifications ============

export function useNotifications(params?: { page?: number; unreadOnly?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.unreadOnly) qs.set("unreadOnly", "true");
      const q = qs.toString();
      return apiFetch<
        PaginatedResponse<NotificationDTO> & { unreadCount: number }
      >(`/notifications${q ? `?${q}` : ""}`);
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch("/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ============ System Keys ============

export function useSystemKeys() {
  return useQuery({
    queryKey: queryKeys.systemKeys,
    queryFn: () =>
      apiFetch<
        Array<{
          id: string;
          serviceType: string;
          displayName: string;
          pricePerExecution: number;
          isActive: boolean;
        }>
      >("/system-keys"),
  });
}

// ============ User API Keys ============

export function useUserApiKeys() {
  return useQuery({
    queryKey: queryKeys.userApiKeys,
    queryFn: () => apiFetch<UserApiKeyDTO[]>("/settings/api-keys"),
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; scopes?: string[]; expiresAt?: string }) =>
      apiFetch<{ id: string; key: string }>("/settings/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userApiKeys });
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/settings/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userApiKeys });
    },
  });
}

// ============ Profile / Settings ============

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email?: string;
      timezone?: string;
      language?: string;
    }) =>
      apiFetch("/settings/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ message: string }>("/settings/password", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ secret: string; qrCodeUrl: string }>("/auth/2fa/setup", {
        method: "POST",
      }),
  });
}

export function useVerify2FA() {
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<{ message: string }>("/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
  });
}

export function useDisable2FA() {
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<{ message: string }>("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
  });
}

export function useUpdateNotificationPrefs() {
  return useMutation({
    mutationFn: (prefs: {
      email?: boolean;
      inApp?: boolean;
      pushErrors?: boolean;
      pushActions?: boolean;
      pushExecutions?: boolean;
      weeklyReport?: boolean;
    }) =>
      apiFetch("/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify(prefs),
      }),
  });
}

// ============ Referral ============

export function useReferral() {
  return useQuery({
    queryKey: queryKeys.referral,
    queryFn: () =>
      apiFetch<{
        code: string;
        referrals: ReferralDTO[];
      }>("/settings/referral"),
  });
}

// ============ Favorites ============

export function useFavorites() {
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () =>
      apiFetch<Array<{ templateId: string; createdAt: string }>>("/favorites"),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      apiFetch(`/favorites/${templateId}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}

// ============ Sessions ============

export interface SessionItem {
  id: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
  createdAt: string;
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => apiFetch<SessionItem[]>("/settings/sessions"),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/settings/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch("/settings/sessions/revoke-others", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });
}

// ============ Account ============

export function useExportAccount() {
  return useMutation({
    mutationFn: () =>
      apiFetch("/settings/account/export", { method: "POST" }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/settings/account", { method: "DELETE" }),
  });
}
