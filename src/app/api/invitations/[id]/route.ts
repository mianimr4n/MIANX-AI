// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Invitation Actions API
// POST   /api/invitations/:id/accept  — Accept invitation
// POST   /api/invitations/:id/reject  — Reject invitation
// DELETE /api/invitations/:id          — Revoke/cancel invitation
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// PATCH /api/invitations/:id — Accept or reject
export const PATCH = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const invitation = await db.organizationMembership.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  const body = await request.json()
  const { action } = body // 'accept' | 'reject'

  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'accept' or 'reject'" },
      { status: 400 }
    )
  }

  const newStatus = action === 'accept' ? 'active' : 'removed'

  const updated = await db.organizationMembership.update({
    where: { id },
    data: {
      status: newStatus,
      ...(action === 'accept' ? { joinedAt: new Date() } : {}),
    },
  })

  return NextResponse.json(apiEnvelope(updated))
}, { permission: 'member.invite' })

// DELETE /api/invitations/:id — Revoke invitation
export const DELETE = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const invitation = await db.organizationMembership.findFirst({
    where: { id, organizationId: ctx.organizationId, status: 'invited' },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Pending invitation not found' }, { status: 404 })
  }

  await db.membershipRole.deleteMany({ where: { membershipId: id } })
  await db.organizationMembership.delete({ where: { id } })

  return NextResponse.json({ data: { revoked: true } })
}, { permission: 'member.invite' })
