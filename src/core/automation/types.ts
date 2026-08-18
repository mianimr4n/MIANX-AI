/**
 * @module core/automation/types
 * Type definitions for the Event & Automation module.
 * Covers events, workflows, jobs, approvals, and failure classification.
 */

// ── Failure Classification ─────────────────────────────────────

/** Enum-like failure classes for categorising errors */
export const FailureClass = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TRANSIENT_EXTERNAL_ERROR: 'TRANSIENT_EXTERNAL_ERROR',
  PERMANENT_EXTERNAL_ERROR: 'PERMANENT_EXTERNAL_ERROR',
  TIMEOUT: 'TIMEOUT',
  AI_ERROR: 'AI_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type FailureClassValue =
  (typeof FailureClass)[keyof typeof FailureClass];

// ── Event Types ─────────────────────────────────────────────────

/** Full event contract matching the Event Prisma model */
export interface EventEnvelope {
  id: string;
  eventType: string;
  eventVersion: string;
  organizationId: string;
  domainId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  actorType: string;
  actorId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  status: 'pending' | 'delivered' | 'failed' | 'dead_lettered';
  deliveredAt?: Date | null;
  createdAt: Date;
}

/** Data required to publish a new event */
export interface PublishEventData {
  eventType: string;
  eventVersion?: string;
  organizationId: string;
  domainId?: string;
  sourceType?: string;
  sourceId?: string;
  actorType?: string;
  actorId?: string;
  correlationId?: string;
  causationId?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Event Bus Types ─────────────────────────────────────────────

/** A handler function that processes an event */
export type EventHandler = (event: EventEnvelope) => void | Promise<void>;

// ── Trigger Types ───────────────────────────────────────────────

/** Configuration for how a workflow is triggered */
export interface TriggerConfig {
  eventType?: string;
  schedule?: string;
  manual?: boolean;
}

// ── Workflow Types ──────────────────────────────────────────────

/** Configuration for a single workflow step */
export interface ActionConfig {
  type: string;
  params: Record<string, unknown>;
  permission?: string;
}

/** Configuration for an approval step */
export interface ApprovalConfig {
  requiredRole?: string;
  expiresInSeconds?: number;
}

/** Configuration for an AI decision step */
export interface AIStepConfig {
  prompt: string;
  model?: string;
  provider?: string;
  outputSchema?: Record<string, unknown>;
}

/** A single workflow step */
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'approval' | 'ai_decision' | 'delay';
  config:
    | ActionConfig
    | WorkflowCondition
    | ApprovalConfig
    | AIStepConfig
    | { delayMs: number };
}

/** A condition that can be evaluated against context data */
export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: unknown;
}

/** Retry policy for workflows and jobs */
export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
  retryableErrors?: string[];
}

/** The parsed `steps` JSON from a Workflow record */
export interface WorkflowDefinition {
  steps: WorkflowStep[];
  conditions?: WorkflowCondition[];
}

/** Data for creating a new workflow */
export interface CreateWorkflowData {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  triggerType?: string;
  triggerConfig: TriggerConfig;
  steps: WorkflowStep[];
  conditions?: WorkflowCondition[];
  retryPolicy?: RetryPolicy;
  timeoutSeconds?: number;
  status?: 'draft' | 'active' | 'disabled' | 'archived';
}

/** Data for updating a workflow */
export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  triggerType?: string;
  triggerConfig?: TriggerConfig;
  steps?: WorkflowStep[];
  conditions?: WorkflowCondition[];
  retryPolicy?: RetryPolicy;
  timeoutSeconds?: number;
  status?: 'draft' | 'active' | 'disabled' | 'archived';
}

// ── Workflow Run Types ──────────────────────────────────────────

/** Context passed through workflow step execution */
export interface WorkflowContext {
  input: Record<string, unknown>;
  stepOutputs: Record<string, unknown>;
  workflowRunId: string;
  organizationId: string;
  workflowId: string;
  currentStepIndex?: number;
}

// ── Job Types ───────────────────────────────────────────────────

/** Payload structure for a job */
export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

/** Data for enqueueing a new job */
export interface EnqueueJobData {
  organizationId: string;
  type: string;
  payload?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  scheduledAt?: Date;
  maxAttempts?: number;
}

/** A job executor function */
export type JobExecutor = (
  job: {
    id: string;
    organizationId: string;
    type: string;
    payload: Record<string, unknown>;
  attempts: number;
  },
) => Promise<Record<string, unknown>>;

// ── Approval Types ──────────────────────────────────────────────

/** Data for creating a new approval */
export interface CreateApprovalData {
  workflowRunId: string;
  workflowStepRunId?: string;
  organizationId: string;
  requestedAction: Record<string, unknown>;
  requestedBy?: string;
  expiresInSeconds?: number;
}

// ── Pagination / Filters ────────────────────────────────────────

/** Pagination parameters */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Filters for listing events */
export interface EventFilters {
  eventType?: string;
  status?: 'pending' | 'delivered' | 'failed' | 'dead_lettered';
  actorType?: string;
  domainId?: string;
  from?: Date;
  to?: Date;
}
