// ============ Enums ============

export enum PlanType {
  FREE = "free",
  PRO = "pro",
  BUSINESS = "business",
}

export const PLAN_LIMITS: Record<PlanType, { workflows: number; executionsPerMonth: number; price: number }> = {
  [PlanType.FREE]: { workflows: 3, executionsPerMonth: 100, price: 0 },
  [PlanType.PRO]: { workflows: 50, executionsPerMonth: 10_000, price: 29 },
  [PlanType.BUSINESS]: { workflows: Infinity, executionsPerMonth: 100_000, price: 99 },
};

export enum WorkflowStatus {
  PENDING = "pending",
  TESTING = "testing",
  ACTIVE = "active",
  PAUSED = "paused",
  NEEDS_ATTENTION = "needs_attention",
  ERROR = "error",
}

export enum ExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCESS = "success",
  FAILED = "failed",
}

export enum TriggerType {
  WEBHOOK = "webhook",
  CRON = "cron",
  MANUAL = "manual",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  TRIALING = "trialing",
}

export enum NotificationType {
  EXECUTION_SUCCESS = "execution_success",
  EXECUTION_FAILED = "execution_failed",
  WORKFLOW_PAUSED = "workflow_paused",
  WORKFLOW_NEEDS_ATTENTION = "workflow_needs_attention",
  PLAN_UPGRADED = "plan_upgraded",
  PLAN_DOWNGRADED = "plan_downgraded",
  REFERRAL_REWARD = "referral_reward",
  SYSTEM = "system",
}

// ============ Workflow Definition ============

export type NodeType =
  | "webhook"
  | "cron"
  | "http_request"
  | "email"
  | "condition"
  | "transform"
  | "set_variable"
  | "loop"
  | "delay"
  | "native";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, unknown>;
  next?: string[];
  next_true?: string[];
  next_false?: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  trigger: { type: TriggerType; config?: Record<string, unknown> };
  required_credentials: string[];
  nodes: WorkflowNode[];
}

// ============ API DTOs ============

export interface RegisterRequest {
  email: string;
  password: string;
  referralCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

export interface UserDTO {
  id: string;
  email: string;
  plan: PlanType;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface CredentialCreateRequest {
  serviceType: string;
  name: string;
  data: Record<string, string>;
}

export interface CredentialDTO {
  id: string;
  serviceType: string;
  name: string;
  createdAt: string;
}

export interface ActivateWorkflowRequest {
  templateId: string;
  credentialMapping: Record<string, string>;
  triggerConfig?: Record<string, unknown>;
}

export interface WorkflowDTO {
  id: string;
  templateId: string;
  templateName: string;
  status: WorkflowStatus;
  createdAt: string;
  lastExecutionAt?: string;
  executionCount: number;
}

export interface ExecutionDTO {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  logs: ExecutionLogEntry[];
  durationMs?: number;
  triggerType?: string;
  errorNodeId?: string;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface ExecutionLogEntry {
  nodeId: string;
  nodeType?: string;
  status: "success" | "error";
  duration: number;
  output?: unknown;
  error?: string;
}

// Keep backward compat alias
export type ExecutionLog = ExecutionLogEntry;

export interface TemplateDTO {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  category: string;
  categories?: string[];
  tags: string[];
  icon?: string;
  triggerType: TriggerType;
  requiredCredentials: string[];
  nodeCount: number;
  activationsCount?: number;
  isPublished?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ Activation Flow ============

export interface CredentialMappingEntry {
  type: "user_credential" | "system_key";
  credential_id?: string;
  service?: string;
  price_per_execution?: number;
}

export interface ActivationPreviewCredential {
  service: string;
  status: "matched" | "missing";
  credentialId?: string;
  credentialName?: string;
  systemKey?: {
    displayName: string;
    pricePerExecution: number;
  };
}

export interface ActivationPreviewResponse {
  templateId: string;
  templateName: string;
  triggerType: string;
  credentials: ActivationPreviewCredential[];
}

export interface SystemKeyDTO {
  id: string;
  serviceType: string;
  displayName: string;
  pricePerExecution: number;
  isActive: boolean;
}

export interface ActivateWorkflowFullRequest {
  templateId: string;
  credentialMapping: Record<string, CredentialMappingEntry>;
  triggerConfig?: {
    type: string;
    cron?: string;
  };
}

// ============ AI Node Analysis ============

export interface NodeAnalysisEntry {
  nodeId: string;
  nodeType: string;
  externalService: string | null;
  hasNativeReplacement: boolean;
  nativeNodeId: string | null;
  confidence: number;
  reason: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: "parallelization" | "error_handling" | "caching" | "merge_requests";
  description: string;
  affectedNodes: string[];
  priority: "high" | "medium" | "low";
}

export interface NodeToCreate {
  suggestedId: string;
  name: string;
  replaces: string[];
  implementationApproach: string;
  packages: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface WorkflowAnalysisResult {
  nodeAnalysis: NodeAnalysisEntry[];
  optimizationSuggestions: OptimizationSuggestion[];
  nodesToCreate: NodeToCreate[];
}

export interface NativeNodeDTO {
  id: string;
  nodeId: string;
  name: string;
  description?: string;
  category: string;
  replaces: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  status: string;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface AnalysisReportDTO {
  id: string;
  templateId: string;
  nodeAnalysis: NodeAnalysisEntry[];
  optimizationSuggestions: OptimizationSuggestion[];
  nodesToCreate: NodeToCreate[];
  status: string;
  appliedAt: string | null;
  createdAt: string;
}

// ============ Auth Extended ============

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

// ============ Settings ============

export interface UpdateProfileRequest {
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface NotificationPrefsRequest {
  email?: boolean;
  inApp?: boolean;
}

// ============ User API Keys ============

export interface UserApiKeyDTO {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt?: string;
  createdAt: string;
}

// ============ Notifications ============

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: unknown;
  readAt?: string;
  createdAt: string;
}

// ============ Reviews ============

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface ReviewDTO {
  id: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ============ Referrals ============

export interface ReferralDTO {
  id: string;
  code: string;
  referredId?: string;
  rewardGranted: boolean;
  createdAt: string;
}

// ============ Audit Logs ============

export interface AuditLogDTO {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  createdAt: string;
}

// ============ Billing ============

export interface BillingUsageDTO {
  plan: PlanType;
  status: string;
  executionsUsed: number;
  executionsLimit: number;
  workflowsUsed: number;
  workflowsLimit: number;
  systemKeyCostCents: number;
  periodEnd?: string;
}

// ============ SSE Events ============

export interface SSEExecutionEvent {
  type: "execution_started" | "execution_completed" | "execution_failed" | "node_completed";
  executionId: string;
  data: unknown;
}

export interface SSENotificationEvent {
  type: "notification";
  notification: NotificationDTO;
}

// ============ Public API v1 ============

export interface ApiV1WorkflowDTO {
  id: string;
  name?: string;
  status: string;
  templateId: string;
  createdAt: string;
}

export interface ApiV1ExecutionDTO {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

// ============ Admin Stats ============

export interface AdminStatsDTO {
  totalUsers: number;
  totalWorkflows: number;
  totalExecutions: number;
  totalTemplates: number;
  activeSubscriptions: number;
  executionsToday: number;
  revenueThisMonth: number;
}
