/**
 * @module core/automation/workflow-engine
 * Workflow definition management and execution engine.
 * Handles creating, updating, triggering, and executing workflows
 * with condition evaluation and step-by-step progression.
 */

import { db } from '@/lib/db';
import type {
  CreateWorkflowData,
  UpdateWorkflowData,
  WorkflowCondition,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowStep,
} from './types';

// ── Helpers ────────────────────────────────────────────────────

/** Parse the `steps` JSON field from a Workflow row */
function parseSteps(stepsJson: string): WorkflowStep[] {
  const parsed = JSON.parse(stepsJson);
  return Array.isArray(parsed) ? parsed : [];
}

/** Parse the `conditions` JSON field from a Workflow row */
function parseConditions(conditionsJson: string | null): WorkflowCondition[] {
  if (!conditionsJson) return [];
  const parsed = JSON.parse(conditionsJson);
  return Array.isArray(parsed) ? parsed : [];
}

/** Resolve a dot-notated field path from a nested object */
function resolveField(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

/**
 * Evaluate a single condition against a context object.
 * The context includes `input` (trigger data), `stepOutputs` (from previous steps),
 * and other workflow metadata.
 */
export function evaluateCondition(
  condition: WorkflowCondition,
  context: WorkflowContext,
): boolean {
  // Search both input and stepOutputs for the field
  const source = { ...context.input, ...context.stepOutputs };
  const fieldValue = resolveField(source, condition.field);
  const target = condition.value;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === target;
    case 'neq':
      return fieldValue !== target;
    case 'gt':
      return typeof fieldValue === 'number' && typeof target === 'number'
        ? fieldValue > target
        : false;
    case 'lt':
      return typeof fieldValue === 'number' && typeof target === 'number'
        ? fieldValue < target
        : false;
    case 'gte':
      return typeof fieldValue === 'number' && typeof target === 'number'
        ? fieldValue >= target
        : false;
    case 'lte':
      return typeof fieldValue === 'number' && typeof target === 'number'
        ? fieldValue <= target
        : false;
    case 'contains':
      return typeof fieldValue === 'string' && typeof target === 'string'
        ? fieldValue.includes(target)
        : false;
    case 'in':
      return Array.isArray(target) ? target.includes(fieldValue) : false;
    default:
      return false;
  }
}

/**
 * Evaluate all workflow-level conditions (entry guard).
 * All conditions must pass (AND logic).
 */
function evaluateAllConditions(
  conditions: WorkflowCondition[],
  context: WorkflowContext,
): boolean {
  return conditions.every((c) => evaluateCondition(c, context));
}

/**
 * Execute a single workflow step.
 * - `action`: stores params as output (extensible via job executors)
 * - `condition`: evaluates inline condition, passes or skips
 * - `approval`: creates an Approval record and pauses the run
 * - `ai_decision`: placeholder that stores the AI config in output
 * - `delay`: sleeps for the configured duration
 */
async function executeStep(
  step: WorkflowStep,
  context: WorkflowContext,
): Promise<{ output: unknown; status: 'completed' | 'failed' | 'skipped' | 'waiting_approval'; error?: string }> {
  try {
    switch (step.type) {
      case 'action': {
        const cfg = step.config as { type: string; params: Record<string, unknown> };
        // Action steps produce their params merged with a timestamp as output.
        // In production, these would dispatch to registered action executors.
        const output = {
          ...cfg.params,
          _actionType: cfg.type,
          _executedAt: new Date().toISOString(),
        };
        return { output, status: 'completed' };
      }

      case 'condition': {
        const cond = step.config as WorkflowCondition;
        const passed = evaluateCondition(cond, context);
        return {
          output: { passed, field: cond.field, operator: cond.operator, value: cond.value },
          status: passed ? 'completed' : 'skipped',
        };
      }

      case 'approval': {
        const cfg = step.config as { requiredRole?: string; expiresInSeconds?: number };
        const expiresInSeconds = cfg.expiresInSeconds ?? 86400;

        await db.approval.create({
          data: {
            workflowRunId: context.workflowRunId,
            organizationId: context.organizationId,
            requestedAction: JSON.stringify({
              stepId: step.id,
              stepName: step.name,
              stepIndex: context.currentStepIndex,
              requiredRole: cfg.requiredRole ?? null,
            }),
            expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
          },
        });

        return {
          output: { waitingForApproval: true, requiredRole: cfg.requiredRole ?? 'any' },
          status: 'waiting_approval',
        };
      }

      case 'ai_decision': {
        const cfg = step.config as { prompt: string; model?: string; provider?: string; outputSchema?: Record<string, unknown> };
        // In a real system this would call the AI service.
        // Here we store the decision request as output so the pipeline can continue.
        const output = {
          _aiDecision: true,
          prompt: cfg.prompt,
          model: cfg.model ?? 'default',
          provider: cfg.provider ?? 'default',
          decidedAt: new Date().toISOString(),
          result: 'deferred',
        };
        return { output, status: 'completed' };
      }

      case 'delay': {
        const cfg = step.config as { delayMs: number };
        const ms = Math.max(0, Math.min(cfg.delayMs, 300_000)); // cap at 5 min
        await new Promise((resolve) => setTimeout(resolve, ms));
        return {
          output: { delayedMs: ms, resumedAt: new Date().toISOString() },
          status: 'completed',
        };
      }

      default:
        return { output: { unknownStepType: (step as { type: string }).type }, status: 'completed' };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: null, status: 'failed', error: message };
  }
}

// ── CRUD ───────────────────────────────────────────────────────

/**
 * Create a new workflow definition.
 *
 * @param data - Workflow creation payload
 * @returns The created workflow row
 */
export async function createWorkflow(data: CreateWorkflowData) {
  return db.workflow.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      triggerType: data.triggerType ?? 'event',
      triggerConfig: JSON.stringify(data.triggerConfig),
      steps: JSON.stringify(data.steps),
      conditions: data.conditions ? JSON.stringify(data.conditions) : null,
      retryPolicy: data.retryPolicy ? JSON.stringify(data.retryPolicy) : null,
      timeoutSeconds: data.timeoutSeconds ?? 300,
      status: data.status ?? 'draft',
    },
  });
}

/**
 * List all workflows for an organization.
 *
 * @param organizationId - The organization to list workflows for
 * @returns Array of workflow rows (excludes archived unless requested)
 */
export async function listWorkflows(organizationId: string) {
  return db.workflow.findMany({
    where: { organizationId, status: { not: 'archived' } },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a single workflow by ID and organization.
 *
 * @param id - Workflow ID
 * @param organizationId - Organization ID for scoping
 * @returns The workflow row or null
 */
export async function getWorkflow(id: string, organizationId: string) {
  return db.workflow.findUnique({ where: { id, organizationId } });
}

/**
 * Update a workflow definition.
 *
 * @param id - Workflow ID
 * @param organizationId - Organization ID
 * @param data - Fields to update
 * @returns The updated workflow row
 */
export async function updateWorkflow(
  id: string,
  organizationId: string,
  data: UpdateWorkflowData,
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
  if (data.triggerConfig !== undefined) updateData.triggerConfig = JSON.stringify(data.triggerConfig);
  if (data.steps !== undefined) updateData.steps = JSON.stringify(data.steps);
  if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);
  if (data.retryPolicy !== undefined) updateData.retryPolicy = JSON.stringify(data.retryPolicy);
  if (data.timeoutSeconds !== undefined) updateData.timeoutSeconds = data.timeoutSeconds;
  if (data.status !== undefined) updateData.status = data.status;

  return db.workflow.update({
    where: { id, organizationId },
    data: updateData,
  });
}

/**
 * Soft-delete (archive) a workflow.
 *
 * @param id - Workflow ID
 * @param organizationId - Organization ID
 * @returns The archived workflow row
 */
export async function deleteWorkflow(id: string, organizationId: string) {
  return db.workflow.update({
    where: { id, organizationId },
    data: { status: 'archived' },
  });
}

// ── Execution ──────────────────────────────────────────────────

/**
 * Trigger a workflow run. Creates a WorkflowRun record and begins execution.
 *
 * @param workflowId - The workflow definition to execute
 * @param organizationId - Organization ID
 * @param input - Optional input data for the run
 * @param triggerEventId - Optional event that triggered this run
 * @returns The created WorkflowRun record
 */
export async function triggerWorkflow(
  workflowId: string,
  organizationId: string,
  input?: Record<string, unknown>,
  triggerEventId?: string,
) {
  const workflow = await db.workflow.findUnique({
    where: { id: workflowId, organizationId },
  });

  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found in organization ${organizationId}`);
  }

  if (workflow.status !== 'active') {
    throw new Error(`Workflow ${workflowId} is not active (status: ${workflow.status})`);
  }

  const run = await db.workflowRun.create({
    data: {
      workflowId,
      organizationId,
      triggerEventId: triggerEventId ?? null,
      status: 'queued',
      input: input ? JSON.stringify(input) : null,
      currentStep: 0,
    },
  });

  // Kick off execution asynchronously.
  executeWorkflowRun(run.id, organizationId).catch((err) => {
    console.error(`[workflow-engine] Run ${run.id} failed:`, err);
  });

  return run;
}

/**
 * Execute a workflow run step by step.
 * Evaluates workflow-level conditions first (entry guard),
 * then iterates through steps, creating WorkflowStepRun records and
 * updating the run status as it progresses.
 *
 * @param runId - The WorkflowRun ID
 * @param organizationId - Organization ID for scoping
 * @param resumeAfterStep - Optional step index to resume from (for post-approval continuation)
 */
export async function executeWorkflowRun(
  runId: string,
  organizationId: string,
  resumeAfterStep?: number,
): Promise<void> {
  const run = await db.workflowRun.findUnique({
    where: { id: runId, organizationId },
    include: { workflow: true },
  });

  if (!run) {
    throw new Error(`WorkflowRun ${runId} not found`);
  }

  const steps = parseSteps(run.workflow.steps);
  const conditions = parseConditions(run.workflow.conditions);
  const input = run.input ? JSON.parse(run.input) : {};

  // Build the execution context
  const context: WorkflowContext = {
    input,
    stepOutputs: {},
    workflowRunId: run.id,
    organizationId,
    workflowId: run.workflowId,
  };

  // Mark the run as running
  await db.workflowRun.update({
    where: { id: run.id },
    data: { status: 'running', startedAt: run.startedAt ?? new Date() },
  });

  // Evaluate workflow-level entry conditions (skip on resume)
  if (resumeAfterStep === undefined && conditions.length > 0 && !evaluateAllConditions(conditions, context)) {
    await db.workflowRun.update({
      where: { id: run.id },
      data: { status: 'completed', completedAt: new Date(), output: JSON.stringify({ skipped: true, reason: 'entry_conditions_not_met' }) },
    });
    return;
  }

  // On resume, reconstruct stepOutputs from previously completed step runs
  const startStep = resumeAfterStep !== undefined ? resumeAfterStep + 1 : 0;
  if (resumeAfterStep !== undefined) {
    const completedSteps = await db.workflowStepRun.findMany({
      where: { workflowRunId: run.id, status: 'completed' },
      orderBy: { createdAt: 'asc' },
    });
    for (const sr of completedSteps) {
      if (sr.output) {
        try {
          // Find the step by stepId to use as key
          const parsed = JSON.parse(sr.output);
          context.stepOutputs[sr.stepId] = parsed;
        } catch { /* ignore parse errors */ }
      }
    }
  }

  // Execute steps sequentially starting from startStep
  for (let i = startStep; i < steps.length; i++) {
    const step = steps[i];
    context.currentStepIndex = i;

    // Update current step index
    await db.workflowRun.update({
      where: { id: run.id },
      data: { currentStep: i },
    });

    // Create step run record
    const stepRun = await db.workflowStepRun.create({
      data: {
        workflowRunId: run.id,
        stepId: step.id,
        status: 'running',
        input: JSON.stringify({ ...context.input, ...context.stepOutputs }),
        startedAt: new Date(),
      },
    });

    const result = await executeStep(step, context);

    // Update step run
    const stepRunUpdate: Record<string, unknown> = {
      status: result.status,
      output: result.output ? JSON.stringify(result.output) : null,
      error: result.error ?? null,
      completedAt: new Date(),
    };

    await db.workflowStepRun.update({
      where: { id: stepRun.id },
      data: stepRunUpdate,
    });

    // Store step output in context for subsequent steps
    if (result.output) {
      context.stepOutputs[step.id] = result.output;
    }

    // Handle step outcomes
    if (result.status === 'failed') {
      await db.workflowRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: result.error ?? 'Step failed', completedAt: new Date() },
      });
      return;
    }

    if (result.status === 'waiting_approval') {
      await db.workflowRun.update({
        where: { id: run.id },
        data: { status: 'waiting_approval' },
      });
      return;
    }

    // 'skipped' and 'completed' steps continue to the next step.
  }

  // All steps completed successfully
  await db.workflowRun.update({
    where: { id: run.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      output: JSON.stringify({ stepOutputs: context.stepOutputs }),
    },
  });
}

export { parseSteps, parseConditions, resolveField };
