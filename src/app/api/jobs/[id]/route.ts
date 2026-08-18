// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Job Detail API
// PATCH  /api/jobs/:id        — Cancel a job
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { cancelJob } from '@/core/automation'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

const CANCELLABLE_STATUSES = ['pending', 'running']

// PATCH /api/jobs/:id — Cancel a job
export const PATCH = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const job = await db.job.findUnique({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (!CANCELLABLE_STATUSES.includes(job.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a job with status '${job.status}'. Only pending and running jobs can be cancelled.` },
      { status: 409 },
    )
  }

  const cancelled = await cancelJob(id, ctx.organizationId)

  return NextResponse.json(apiEnvelope({
    ...cancelled,
    payload: cancelled.payload ? JSON.parse(cancelled.payload) : null,
  }))
}, { permission: 'automation.jobs.manage' })
