// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Workflow Manual Trigger API
// POST   /api/workflows/:id/run — Trigger a workflow manually
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { triggerWorkflow, getWorkflow } from '@/core/automation'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// POST /api/workflows/:id/run — Trigger a workflow manually
export const POST = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const workflow = await getWorkflow(id, ctx.organizationId)

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  if (workflow.status !== 'active') {
    return NextResponse.json(
      { error: `Cannot trigger workflow with status '${workflow.status}'. Workflow must be active.` },
      { status: 409 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const { input, eventId } = body as { input?: Record<string, unknown>; eventId?: string }

  if (eventId !== undefined && typeof eventId !== 'string') {
    return NextResponse.json(
      { error: 'eventId must be a string if provided' },
      { status: 400 },
    )
  }

  if (input !== undefined && (typeof input !== 'object' || input === null || Array.isArray(input))) {
    return NextResponse.json(
      { error: 'input must be a non-null object if provided' },
      { status: 400 },
    )
  }

  try {
    const run = await triggerWorkflow(id, ctx.organizationId, input, eventId)

    return NextResponse.json(apiEnvelope({
      ...run,
      input: run.input ? JSON.parse(run.input) : null,
    }), { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}, { permission: 'automation.workflows.execute' })
