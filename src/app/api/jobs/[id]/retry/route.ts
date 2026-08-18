// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Job Retry API
// POST   /api/jobs/:id/retry — Retry a failed job
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// POST /api/jobs/:id/retry — Retry a failed job
export const POST = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const job = await db.job.findUnique({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.status !== 'failed') {
    return NextResponse.json(
      { error: `Cannot retry a job with status '${job.status}'. Only failed jobs can be retried.` },
      { status: 409 },
    )
  }

  if (job.attempts >= job.maxAttempts) {
    return NextResponse.json(
      { error: `Job has exhausted its max attempts (${job.maxAttempts}). Increase maxAttempts to retry.` },
      { status: 409 },
    )
  }

  const retried = await db.job.update({
    where: { id },
    data: { status: 'pending' },
  })

  return NextResponse.json(apiEnvelope({
    ...retried,
    payload: retried.payload ? JSON.parse(retried.payload) : null,
  }))
}, { permission: 'automation.jobs.manage' })
