// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Workflow Run Detail API
// GET    /api/workflows/runs/:id — Get workflow run with step runs
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/workflows/runs/:id — Get workflow run with step runs
export const GET = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const run = await db.workflowRun.findUnique({
    where: { id, organizationId: ctx.organizationId },
    include: {
      workflow: {
        select: { id: true, name: true, slug: true },
      },
      stepRuns: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!run) {
    return NextResponse.json({ error: 'Workflow run not found' }, { status: 404 })
  }

  return NextResponse.json(apiEnvelope({
    ...run,
    input: run.input ? JSON.parse(run.input) : null,
    output: run.output ? JSON.parse(run.output) : null,
    stepRuns: run.stepRuns.map((sr) => ({
      ...sr,
      input: sr.input ? JSON.parse(sr.input) : null,
      output: sr.output ? JSON.parse(sr.output) : null,
    })),
  }))
}, { permission: 'automation.workflows.view' })
