// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Invitations API
// GET  /api/invitations  — List pending invitations for org
// POST /api/invitations  — Invite user to organization
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/invitations — List pending invitations
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const invitations = await db.organizationMembership.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: 'invited',
    },
    include: {
      profile: { select: { displayName: true, avatarUrl: true, userId: true } },
      roles: { include: { role: { select: { name: true, slug: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(apiEnvelope(invitations))
}, { permission: 'member.invite' })

// POST /api/invitations — Invite user (creates membership with 'invited' status)
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { userId, roleId } = body

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    )
  }

  // Check if already a member (any status)
  const existing = await db.organizationMembership.findFirst({
    where: {
      organizationId: ctx.organizationId,
      userId,
    },
  })

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.json(
        { error: 'User is already an active member' },
        { status: 409 }
      )
    }
    if (existing.status === 'invited') {
      return NextResponse.json(
        { error: 'User already has a pending invitation' },
        { status: 409 }
      )
    }
    if (existing.status === 'suspended') {
      // Re-activate suspended member
      await db.organizationMembership.update({
        where: { id: existing.id },
        data: { status: 'active', joinedAt: new Date() },
      })
      return NextResponse.json(apiEnvelope({ ...existing, status: 'active' }), { status: 200 })
    }
    if (existing.status === 'removed') {
      return NextResponse.json(
        { error: 'User was previously removed. Contact support to re-invite.' },
        { status: 409 }
      )
    }
  }

  // Ensure profile exists
  await db.profile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })

  // Create membership
  const membership = await db.organizationMembership.create({
    data: {
      organizationId: ctx.organizationId,
      userId,
      status: 'invited',
    },
  })

  // Assign default role (member) if no specific role provided
  const targetRoleId = roleId || (await db.role.findFirst({
    where: { organizationId: ctx.organizationId, slug: 'member' },
  }))?.id

  if (targetRoleId) {
    await db.membershipRole.create({
      data: { membershipId: membership.id, roleId: targetRoleId },
    })
  }

  return NextResponse.json(apiEnvelope(membership), { status: 201 })
}, { permission: 'member.invite' })
