// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Workflow Runs API
// GET    /api/workflows/runs   — List workflow runs for organization
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

const VALID_RUN_STATUSES = [
  'queued',
  'running',
  'waiting',
  'waiting_approval',
  'completed',
  'failed',
  'cancelled',
  'timed_out',
  'dead_lettered',
] as const

type RunStatusFilter = (typeof VALID_RUN_STATUSES)[number]

// GET /api/workflows/runs — List workflow runs for org
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const { searchParams } = request.nextUrl

  const rawStatus = searchParams.get('status')
  const workflowId = searchParams.get('workflowId') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20))

  if (rawStatus && !VALID_RUN_STATUSES.includes(rawStatus as RunStatusFilter)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_RUN_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  const where: Record<string, unknown> = { organizationId: ctx.organizationId }

  if (rawStatus) {
    where.status = rawStatus as RunStatusFilter
  }
  if (workflowId) {
    where.workflowId = workflowId
  }

  const skip = (page - 1) * pageSize

  const [runs, total] = await Promise.all([
    db.workflowRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        workflow: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    db.workflowRun.count({ where }),
  ])

  const parsed = runs.map((run) => ({
    ...run,
    input: run.input ? JSON.parse(run.input) : null,
    output: run.output ? JSON.parse(run.output) : null,
  }))

  return NextResponse.json(
    apiEnvelope(parsed, {
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }),
  )
}, { anyPermission: ['automation.workflows.view', 'automation.workflows.manage'] })
