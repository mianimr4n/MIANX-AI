// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Approvals API
// GET    /api/approvals       — List pending approvals for organization
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { getPendingApprovals } from '@/core/automation'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/approvals — List pending approvals for organization
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const approvals = await getPendingApprovals(ctx.organizationId)

  const parsed = approvals.map((a) => ({
    ...a,
    requestedAction: JSON.parse(a.requestedAction),
  }))

  return NextResponse.json(apiEnvelope(parsed))
}, { permission: 'automation.approvals.manage' })
