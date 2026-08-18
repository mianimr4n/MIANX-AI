/**
 * @module core/automation
 * Barrel export for the Event & Automation module.
 * Provides event publishing, workflow execution, job queuing,
 * and approval management capabilities.
 */

// ── Types ─────────────────────────────────────────────────────
export type {
  ActionConfig,
  AIStepConfig,
  ApprovalConfig,
  CreateApprovalData,
  CreateWorkflowData,
  EnqueueJobData,
  EventEnvelope,
  EventFilters,
  EventHandler,
  FailureClassValue,
  JobExecutor,
  JobPayload,
  PaginatedResult,
  PublishEventData,
  RetryPolicy,
  TriggerConfig,
  UpdateWorkflowData,
  WorkflowCondition,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowStep,
} from './types';

export { FailureClass } from './types';

// ── Event Bus ─────────────────────────────────────────────────
export { EventBus, eventBus, matchPattern } from './event-bus';

// ── Events (Outbox) ───────────────────────────────────────────
export {
  deliverPendingEvents,
  dispatchEvent,
  getEvent,
  listEvents,
  publishEvent,
  subscribe,
  toEnvelope,
  unsubscribe,
} from './events';

// ── Workflow Engine ───────────────────────────────────────────
export {
  createWorkflow,
  deleteWorkflow,
  evaluateCondition,
  executeWorkflowRun,
  getWorkflow,
  listWorkflows,
  triggerWorkflow,
  updateWorkflow,
} from './workflow-engine';

// ── Job Queue ─────────────────────────────────────────────────
export {
  cancelJob,
  completeJob,
  enqueueJob,
  failJob,
  listJobs,
  processPendingJobs,
  registerJobExecutor,
  retryFailedJobs,
} from './job-queue';

// ── Event-Workflow Bridge ───────────────────────────────────
export {
  initEventWorkflowBridge,
  matchEventType as matchEventWorkflowType,
} from './event-workflow-bridge';

// ── Approvals ─────────────────────────────────────────────────
export {
  checkExpiredApprovals,
  createApproval,
  decideApproval,
  getApproval,
  getPendingApprovals,
} from './approval';
