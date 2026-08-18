/**
 * @module core/automation/job-queue
 * Persistent job queue backed by the database.
 * Jobs are ordered by priority and scheduled time, with retry support.
 * Includes built-in executors for notifications and workflow triggers.
 */

import { db } from '@/lib/db';
import type { EnqueueJobData, JobExecutor } from './types';
import { triggerWorkflow } from './workflow-engine';

// ── Priority ordering map ─────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ── Executor Registry ──────────────────────────────────────────

const executors = new Map<string, JobExecutor>();

/**
 * Register a job executor function for a given job type.
 *
 * @param type - The job type string
 * @param executor - Async function that processes the job and returns output
 */
export function registerJobExecutor(type: string, executor: JobExecutor): void {
  executors.set(type, executor);
}

// ── Built-in Executors ─────────────────────────────────────────

/**
 * Built-in executor: creates a Notification record in the database.
 * Expected payload: `{ recipientUserId, type, title, body?, data? }`
 */
registerJobExecutor('send_notification', async (job) => {
  const payload = job.payload as {
    recipientUserId: string;
    type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  };

  const notification = await db.notification.create({
    data: {
      organizationId: job.organizationId,
      recipientUserId: payload.recipientUserId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      data: payload.data ? JSON.stringify(payload.data) : null,
    },
  });

  return { notificationId: notification.id, status: 'created' };
});

/**
 * Built-in executor: triggers a workflow by ID.
 * Expected payload: `{ workflowId, input?, triggerEventId? }`
 */
registerJobExecutor('run_workflow', async (job) => {
  const payload = job.payload as {
    workflowId: string;
    input?: Record<string, unknown>;
    triggerEventId?: string;
  };

  const run = await triggerWorkflow(
    payload.workflowId,
    job.organizationId,
    payload.input,
    payload.triggerEventId,
  );

  return { workflowRunId: run.id, status: 'queued' };
});

// ── Job Operations ─────────────────────────────────────────────

/**
 * Enqueue a new job.
 *
 * @param data - Job creation payload
 * @returns The created Job row
 */
export async function enqueueJob(data: EnqueueJobData) {
  return db.job.create({
    data: {
      organizationId: data.organizationId,
      type: data.type,
      payload: data.payload ? JSON.stringify(data.payload) : null,
      status: 'pending',
      priority: data.priority ?? 'normal',
      scheduledAt: data.scheduledAt ?? null,
      maxAttempts: data.maxAttempts ?? 3,
    },
  });
}

/**
 * List jobs for an organization, optionally filtered by status.
 *
 * @param organizationId - The organization to scope the query
 * @param status - Optional status filter
 * @returns Array of job rows ordered by priority then creation time
 */
export async function listJobs(
  organizationId: string,
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
) {
  const where: Record<string, unknown> = { organizationId };
  if (status) where.status = status;

  // Fetch and sort by priority + scheduled time in JS
  const rows = await db.job.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return rows.sort((a, b) => {
    const pA = PRIORITY_ORDER[a.priority] ?? 99;
    const pB = PRIORITY_ORDER[b.priority] ?? 99;
    if (pA !== pB) return pA - pB;
    // Earlier scheduled time first; nulls go last
    const tA = a.scheduledAt?.getTime() ?? Infinity;
    const tB = b.scheduledAt?.getTime() ?? Infinity;
    return tA - tB;
  });
}

/**
 * Process pending jobs that are ready to run.
 * A job is ready when its scheduledAt (if set) has passed.
 * Jobs are processed in priority order, up to a batch limit.
 *
 * @param organizationId - Optional; if provided, only processes jobs for that org
 * @param limit - Maximum number of jobs to process (default 20)
 */
export async function processPendingJobs(
  organizationId?: string,
  limit: number = 20,
): Promise<void> {
  const now = new Date();

  const where: Record<string, unknown> = {
    status: 'pending',
  };
  if (organizationId) where.organizationId = organizationId;

  // Fetch candidate jobs — priority order handled in-memory
  const candidates = await db.job.findMany({
    where,
    take: limit * 3, // over-fetch to account for sorting
    orderBy: { createdAt: 'asc' },
  });

  // Filter to ready jobs (scheduledAt is past or null) and sort
  const ready = candidates
    .filter((j) => !j.scheduledAt || j.scheduledAt <= now)
    .sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] ?? 99;
      const pB = PRIORITY_ORDER[b.priority] ?? 99;
      return pA !== pB ? pA - pB : a.createdAt.getTime() - b.createdAt.getTime();
    })
    .slice(0, limit);

  for (const job of ready) {
    // Mark as running
    await db.job.update({
      where: { id: job.id },
      data: { status: 'running', runAt: new Date() },
    });

    const executor = executors.get(job.type);

    if (!executor) {
      await failJob(job.id, job.organizationId, `No executor registered for job type '${job.type}'`);
      continue;
    }

    try {
      const payload = job.payload ? JSON.parse(job.payload) : {};
      const output = await executor({
        id: job.id,
        organizationId: job.organizationId,
        type: job.type,
        payload,
        attempts: job.attempts + 1,
      });
      await completeJob(job.id, job.organizationId, output);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await failJob(job.id, job.organizationId, message);
    }
  }
}

/**
 * Mark a job as completed.
 *
 * @param id - Job ID
 * @param organizationId - Organization ID
 * @param output - Optional output data
 * @returns The updated Job row
 */
export async function completeJob(
  id: string,
  organizationId: string,
  output?: Record<string, unknown>,
) {
  return db.job.update({
    where: { id, organizationId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      // Store output in the payload field alongside the original
      ...(output ? { payload: JSON.stringify({ _output: output }) } : {}),
    },
  });
}

/**
 * Mark a job as failed and increment the attempt counter.
 * If attempts reach maxAttempts the job stays failed;
 * otherwise it can be retried via retryFailedJobs.
 *
 * @param id - Job ID
 * @param organizationId - Organization ID
 * @param error - Error message describing the failure
 * @returns The updated Job row
 */
export async function failJob(
  id: string,
  organizationId: string,
  error: string,
) {
  const job = await db.job.findUnique({ where: { id, organizationId } });
  if (!job) throw new Error(`Job ${id} not found`);

  const newAttempts = job.attempts + 1;

  return db.job.update({
    where: { id },
    data: {
      status: 'failed',
      attempts: newAttempts,
      lastError: error,
    },
  });
}

/**
 * Retry failed jobs that haven't exhausted their max attempts.
 * Resets the status to 'pending' so processPendingJobs will pick them up.
 *
 * @param organizationId - Optional; if provided, only retries jobs for that org
 * @returns Number of jobs that were reset to pending
 */
export async function retryFailedJobs(organizationId?: string): Promise<number> {
  const where: Record<string, unknown> = {
    status: 'failed',
  };
  if (organizationId) where.organizationId = organizationId;

  const failedJobs = await db.job.findMany({ where });

  let retried = 0;

  for (const job of failedJobs) {
    if (job.attempts < job.maxAttempts) {
      await db.job.update({
        where: { id: job.id },
        data: { status: 'pending' },
      });
      retried++;
    }
  }

  return retried;
}

/**
 * Cancel a pending or running job.
 *
 * @param id - Job ID
 * @param organizationId - Organization ID
 * @returns The cancelled Job row
 */
export async function cancelJob(id: string, organizationId: string) {
  return db.job.update({
    where: { id, organizationId },
    data: { status: 'cancelled', completedAt: new Date() },
  });
}
