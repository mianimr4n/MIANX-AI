// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Approval Decide API
// POST   /api/approvals/:id/decide — Decide (approve/reject) an approval
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { decideApproval, getApproval } from '@/core/automation'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

const VALID_DECISIONS = ['approved', 'rejected'] as const
type ValidDecision = (typeof VALID_DECISIONS)[number]

// POST /api/approvals/:id/decide — Decide on an approval
export const POST = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const existing = await getApproval(id, ctx.organizationId)

  if (!existing) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  if (existing.decision !== 'pending') {
    return NextResponse.json(
      { error: `Approval is already ${existing.decision}` },
      { status: 409 },
    )
  }

  // Check expiration
  if (existing.expiresAt && existing.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'This approval has expired' },
      { status: 410 },
    )
  }

  const body = await request.json()
  const { decision, reason } = body

  if (!decision || !VALID_DECISIONS.includes(decision as ValidDecision)) {
    return NextResponse.json(
      { error: `decision is required and must be one of: ${VALID_DECISIONS.join(', ')}` },
      { status: 400 },
    )
  }

  if (reason !== undefined && typeof reason !== 'string') {
    return NextResponse.json(
      { error: 'reason must be a string if provided' },
      { status: 400 },
    )
  }

  try {
    const updated = await decideApproval(
      id,
      ctx.organizationId,
      decision as ValidDecision,
      ctx.user.id,
      typeof reason === 'string' ? reason.trim() : undefined,
    )

    return NextResponse.json(apiEnvelope({
      ...updated,
      requestedAction: JSON.parse(updated.requestedAction),
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}, { permission: 'automation.approvals.manage' })
