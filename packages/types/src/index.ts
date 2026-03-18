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
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

export interface UserDTO {
  id: string;
  email: string;
  plan: PlanType;
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
  logs: ExecutionLog[];
  startedAt: string;
  finishedAt?: string;
}

export interface ExecutionLog {
  nodeId: string;
  status: "success" | "error";
  duration: number;
  output?: unknown;
  error?: string;
}

export interface TemplateDTO {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  triggerType: TriggerType;
  requiredCredentials: string[];
  nodeCount: number;
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
