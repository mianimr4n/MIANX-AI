// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Invitations API
// GET  /api/invitations  — List pending invitations for org
// POST /api/invitations  — Invite user to organization
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'
import { parsePagination, prismaPagination } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

// GET /api/invitations — List pending invitations (paginated)
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const pagination = parsePagination(request.nextUrl.searchParams)
  const { skip, take } = prismaPagination(pagination)

  const [invitations, total] = await Promise.all([
    db.organizationMembership.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: 'invited',
      },
      skip,
      take,
      include: {
        profile: { select: { displayName: true, avatarUrl: true, userId: true } },
        roles: { include: { role: { select: { name: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.organizationMembership.count({
      where: { organizationId: ctx.organizationId, status: 'invited' },
    }),
  ])

  return NextResponse.json({
    ...apiEnvelope(invitations),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
      hasMore: pagination.page < Math.ceil(total / pagination.pageSize),
    },
  })
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
  let targetRoleId = roleId
  if (targetRoleId) {
    // Validate roleId belongs to this organization (prevent cross-org role assignment)
    const roleExists = await db.role.findFirst({
      where: { id: targetRoleId, organizationId: ctx.organizationId },
    })
    if (!roleExists) {
      return NextResponse.json(
        { error: 'Role not found in this organization' },
        { status: 400 }
      )
    }
  } else {
    targetRoleId = (await db.role.findFirst({
      where: { organizationId: ctx.organizationId, slug: 'member' },
    }))?.id
  }

  if (targetRoleId) {
    await db.membershipRole.create({
      data: { membershipId: membership.id, roleId: targetRoleId },
    })
  }

  return NextResponse.json(apiEnvelope(membership), { status: 201 })
}, { permission: 'member.invite' })
