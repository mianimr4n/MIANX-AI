// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Enhanced Health Checks (Liveness / Readiness / Dependencies)
// Separates liveness (process alive) from readiness (can serve traffic)
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hasP1Active } from '@/core/observability'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const checkType = searchParams.get('type') || 'full'

  const startTime = Date.now()
  const checks: Record<string, { status: string; latency_ms: number; details?: string }> = {}
  let overallStatus = 'healthy'

  // ── Liveness: Process is alive ─────────────────────────────
  checks.process = { status: 'ok', latency_ms: 0 }

  // ── Database: Readiness check ──────────────────────────────
  try {
    const t0 = Date.now()
    await db.$queryRaw`SELECT 1 as ok`
    const dbLat = Date.now() - t0
    checks.database = { status: dbLat < 500 ? 'ok' : 'degraded', latency_ms: dbLat }
    if (dbLat >= 1000) overallStatus = 'degraded'
  } catch (err) {
    checks.database = { status: 'error', latency_ms: -1, details: String(err) }
    overallStatus = 'error'
  }

  // ── Queue/Job System: Check job processing ─────────────────
  try {
    const t0 = Date.now()
    const pendingJobs = await db.job.count({ where: { status: 'pending' } })
    const failedJobs = await db.job.count({ where: { status: 'failed' } })
    const jobLat = Date.now() - t0
    const queueOk = failedJobs < 50 // Threshold for queue health
    checks.jobs = {
      status: queueOk ? 'ok' : 'degraded',
      latency_ms: jobLat,
      details: `pending=${pendingJobs}, failed=${failedJobs}`,
    }
    if (!queueOk) overallStatus = 'degraded'
  } catch (err) {
    checks.jobs = { status: 'error', latency_ms: -1, details: String(err) }
  }

  // ── Workflow Engine: Check for stuck runs ───────────────────
  try {
    const t0 = Date.now()
    const stuckRuns = await db.workflowRun.count({
      where: {
        status: { in: ['running', 'waiting'] },
        updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) }, // >30min stale
      },
    })
    const wfLat = Date.now() - t0
    checks.workflows = {
      status: stuckRuns === 0 ? 'ok' : 'degraded',
      latency_ms: wfLat,
      details: stuckRuns > 0 ? `stuck_runs=${stuckRuns}` : undefined,
    }
    if (stuckRuns > 0) overallStatus = 'degraded'
  } catch (err) {
    checks.workflows = { status: 'error', latency_ms: -1, details: String(err) }
  }

  // ── P1 Incidents: Platform-level critical check ─────────────
  checks.incidents = {
    status: hasP1Active() ? 'degraded' : 'ok',
    latency_ms: 0,
    details: hasP1Active() ? 'P1 incident active' : undefined,
  }
  if (hasP1Active()) overallStatus = 'degraded'

  // ── Readiness vs Liveness ──────────────────────────────────
  if (checkType === 'liveness') {
    return NextResponse.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    })
  }

  const totalLatency = Date.now() - startTime

  return NextResponse.json({
    status: overallStatus,
    app: 'mianx-ai',
    version: '0.9.0',
    phase: 9,
    checks,
 latency_ms: totalLatency,
    timestamp: new Date().toISOString(),
  })
}
