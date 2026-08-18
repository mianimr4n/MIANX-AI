// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Jobs API
// GET    /api/jobs            — List jobs for organization
// POST   /api/jobs            — Enqueue a new job
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { enqueueJob, listJobs } from '@/core/automation'
import type { EnqueueJobData } from '@/core/automation'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

const VALID_JOB_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const
type JobStatusFilter = (typeof VALID_JOB_STATUSES)[number]

const VALID_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const
type ValidPriority = (typeof VALID_PRIORITIES)[number]

// GET /api/jobs — List jobs for org (with status and type filters)
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const { searchParams } = request.nextUrl

  const rawStatus = searchParams.get('status')
  const type = searchParams.get('type') || undefined

  if (rawStatus && !VALID_JOB_STATUSES.includes(rawStatus as JobStatusFilter)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_JOB_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  // Use core listJobs when only status filter, otherwise use db directly for type filter
  let jobs
  if (rawStatus && !type) {
    jobs = await listJobs(ctx.organizationId, rawStatus as JobStatusFilter)
  } else {
    const where: Record<string, unknown> = { organizationId: ctx.organizationId }
    if (rawStatus) where.status = rawStatus as JobStatusFilter
    if (type) where.type = type

    const rows = await db.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
    jobs = rows.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] ?? 99
      const pB = PRIORITY_ORDER[b.priority] ?? 99
      if (pA !== pB) return pA - pB
      const tA = a.scheduledAt?.getTime() ?? Infinity
      const tB = b.scheduledAt?.getTime() ?? Infinity
      return tA - tB
    })
  }

  const parsed = jobs.map((job) => ({
    ...job,
    payload: job.payload ? JSON.parse(job.payload) : null,
  }))

  return NextResponse.json(apiEnvelope(parsed))
}, { anyPermission: ['automation.jobs.view', 'automation.jobs.manage'] })

// POST /api/jobs — Enqueue a new job
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { type, payload, priority, scheduledAt } = body

  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    return NextResponse.json(
      { error: 'type is required and must be a non-empty string' },
      { status: 400 },
    )
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority as ValidPriority)) {
    return NextResponse.json(
      { error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` },
      { status: 400 },
    )
  }

  if (scheduledAt !== undefined) {
    const date = new Date(scheduledAt)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'scheduledAt must be a valid ISO date string' },
        { status: 400 },
      )
    }
  }

  if (payload !== undefined && (typeof payload !== 'object' || payload === null || Array.isArray(payload))) {
    return NextResponse.json(
      { error: 'payload must be a non-null object if provided' },
      { status: 400 },
    )
  }

  const enqueueData: EnqueueJobData = {
    organizationId: ctx.organizationId,
    type: type.trim(),
    payload: payload || undefined,
    priority: priority as ValidPriority | undefined,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
  }

  const job = await enqueueJob(enqueueData)

  return NextResponse.json(apiEnvelope({
    ...job,
    payload: job.payload ? JSON.parse(job.payload) : null,
  }), { status: 201 })
}, { permission: 'automation.jobs.manage' })
