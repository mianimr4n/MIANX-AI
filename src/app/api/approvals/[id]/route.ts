// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Approval Detail API
// GET    /api/approvals/:id    — Get approval detail
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { getApproval } from '@/core/automation'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

/** Safely parse JSON, returning fallback on failure */
function safeJsonParse(raw: string, fallback: unknown = null): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

// GET /api/approvals/:id — Get approval detail
export const GET = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const approval = await getApproval(id, ctx.organizationId)

  if (!approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
  }

  return NextResponse.json(apiEnvelope({
    ...approval,
    requestedAction: safeJsonParse(approval.requestedAction),
  }))
}, { anyPermission: ['automation.approvals.view', 'automation.approvals.manage'] })
