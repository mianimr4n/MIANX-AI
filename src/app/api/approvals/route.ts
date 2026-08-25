// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Approvals API
// GET    /api/approvals       — List pending approvals for organization
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { getPendingApprovals } from '@/core/automation'
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

// GET /api/approvals — List pending approvals for organization
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const approvals = await getPendingApprovals(ctx.organizationId)

  const parsed = approvals.map((a) => ({
    ...a,
    requestedAction: safeJsonParse(a.requestedAction),
  }))

  return NextResponse.json(apiEnvelope(parsed))
}, { permission: 'automation.approvals.manage' })
