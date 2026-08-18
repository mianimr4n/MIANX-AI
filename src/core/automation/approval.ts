/**
 * @module core/automation/approval
 * Approval engine for human-in-the-loop workflow steps.
 * Manages creating approval requests, deciding on them,
 * and handling expiration.
 */

import { db } from '@/lib/db';
import type { CreateApprovalData } from './types';

/**
 * Create a new approval request attached to a workflow run.
 *
 * @param data - Approval creation payload
 * @returns The created Approval row
 */
export async function createApproval(data: CreateApprovalData) {
  return db.approval.create({
    data: {
      workflowRunId: data.workflowRunId,
      workflowStepRunId: data.workflowStepRunId ?? null,
      organizationId: data.organizationId,
      requestedAction: JSON.stringify(data.requestedAction),
      requestedBy: data.requestedBy ?? null,
      expiresAt: data.expiresInSeconds
        ? new Date(Date.now() + data.expiresInSeconds * 1000)
        : null,
      decision: 'pending',
    },
  });
}

/**
 * Decide (approve or reject) a pending approval.
 * Resumes the parent workflow run if the approval is decided.
 *
 * @param id - Approval ID
 * @param organizationId - Organization ID
 * @param decision - 'approved' or 'rejected'
 * @param approvedBy - ID of the user making the decision
 * @param reason - Optional reason for the decision
 * @returns The updated Approval row
 */
export async function decideApproval(
  id: string,
  organizationId: string,
  decision: 'approved' | 'rejected',
  approvedBy: string,
  reason?: string,
) {
  const approval = await db.approval.findUnique({
    where: { id, organizationId },
  });

  if (!approval) {
    throw new Error(`Approval ${id} not found in organization ${organizationId}`);
  }

  if (approval.decision !== 'pending') {
    throw new Error(`Approval ${id} is already ${approval.decision}`);
  }

  // Check expiration
  if (approval.expiresAt && approval.expiresAt < new Date()) {
    await db.approval.update({
      where: { id },
      data: { decision: 'expired', decidedAt: new Date() },
    });
    throw new Error(`Approval ${id} has expired`);
  }

  const updated = await db.approval.update({
    where: { id },
    data: {
      decision,
      approvedBy,
      reason: reason ?? null,
      decidedAt: new Date(),
    },
  });

  // Resume the workflow run after the approval is decided.
  resumeWorkflowAfterApproval(approval.workflowRunId, decision, reason).catch(
    (err) => {
      console.error(
        `[approval] Failed to resume workflow ${approval.workflowRunId} after ${decision}:`,
        err,
      );
    },
  );

  return updated;
}

/**
 * List all pending (undecided) approvals for an organization.
 *
 * @param organizationId - Organization ID
 * @returns Array of pending Approval rows
 */
export async function getPendingApprovals(organizationId: string) {
  return db.approval.findMany({
    where: { organizationId, decision: 'pending' },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get a single approval by ID and organization.
 *
 * @param id - Approval ID
 * @param organizationId - Organization ID
 * @returns The Approval row or null
 */
export async function getApproval(id: string, organizationId: string) {
  return db.approval.findUnique({
    where: { id, organizationId },
  });
}

/**
 * Check and mark any expired pending approvals.
 * Should be called periodically (e.g. by a cron job).
 *
 * @returns Number of approvals that were marked as expired
 */
export async function checkExpiredApprovals(): Promise<number> {
  const now = new Date();

  const result = await db.approval.updateMany({
    where: {
      decision: 'pending',
      expiresAt: { not: null, lt: now },
    },
    data: {
      decision: 'expired',
      decidedAt: now,
    },
  });

  // Resume any workflow runs that were waiting on expired approvals
  const expiredApprovals = await db.approval.findMany({
    where: { decision: 'expired', decidedAt: now },
    select: { workflowRunId: true, id: true },
  });

  for (const approval of expiredApprovals) {
    resumeWorkflowAfterApproval(approval.workflowRunId, 'expired', 'Approval expired').catch(
      (err) => {
        console.error(
          `[approval] Failed to resume workflow ${approval.workflowRunId} after expiration:`,
          err,
        );
      },
    );
  }

  return result.count;
}

/**
 * Internal helper: resume a workflow run after an approval decision.
 * - If approved: mark the run as running and continue execution.
 * - If rejected: mark the run as cancelled.
 * - If expired: mark the run as cancelled.
 */
async function resumeWorkflowAfterApproval(
  workflowRunId: string,
  decision: 'approved' | 'rejected' | 'expired',
  _reason?: string,
): Promise<void> {
  const run = await db.workflowRun.findUnique({
    where: { id: workflowRunId },
  });

  if (!run || run.status !== 'waiting_approval') {
    return;
  }

  if (decision === 'approved') {
    // Extract the step index from the approval's requestedAction
    let resumeAfterStep: number | undefined;
    try {
      const action = JSON.parse(approval.requestedAction);
      if (typeof action.stepIndex === 'number') {
        resumeAfterStep = action.stepIndex;
      }
    } catch { /* ignore */ }

    await db.workflowRun.update({
      where: { id: workflowRunId },
      data: { status: 'running' },
    });

    // Dynamically import to avoid circular dependency.
    const { executeWorkflowRun } = await import('./workflow-engine');
    await executeWorkflowRun(workflowRunId, run.organizationId, resumeAfterStep);
  } else {
    await db.workflowRun.update({
      where: { id: workflowRunId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        output: JSON.stringify({
          cancelledReason: `approval_${decision}`,
        }),
      },
    });
  }
}
