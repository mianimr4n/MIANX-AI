// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Membership Role Assignment API
// GET    /api/memberships/:id/roles  — List member's roles
// POST   /api/memberships/:id/roles  — Assign role to member
// DELETE /api/memberships/:id/roles  — Unassign role from member
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/memberships/:id/roles
export const GET = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const membership = await db.organizationMembership.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { roles: { include: { role: true } } },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  return NextResponse.json(apiEnvelope(membership.roles.map(mr => mr.role)))
}, { anyPermission: ['member.view', 'organization.view'] })

// POST /api/memberships/:id/roles — Assign role
export const POST = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const membership = await db.organizationMembership.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  const body = await request.json()
  const { roleId } = body

  if (!roleId) {
    return NextResponse.json({ error: 'roleId is required' }, { status: 400 })
  }

  const role = await db.role.findFirst({
    where: { id: roleId, organizationId: ctx.organizationId },
  })
  if (!role) {
    return NextResponse.json({ error: 'Role not found in this organization' }, { status: 404 })
  }

  // Prevent self-promotion to owner/admin
  const isSelfPromotion = membership.userId === ctx.user.id
  if (isSelfPromotion && (role.slug === 'owner' || role.slug === 'admin')) {
    return NextResponse.json(
      { error: 'Cannot promote yourself to Owner or Admin' },
      { status: 403 }
    )
  }

  // Only owners can assign owner role
  if (role.slug === 'owner' && !ctx.roles.some(r => r.slug === 'owner')) {
    return NextResponse.json(
      { error: 'Only Owners can assign the Owner role' },
      { status: 403 }
    )
  }

  const existing = await db.membershipRole.findFirst({
    where: { membershipId: id, roleId },
  })
  if (existing) {
    return NextResponse.json({ error: 'Role already assigned' }, { status: 409 })
  }

  const assigned = await db.membershipRole.create({
    data: { membershipId: id, roleId },
  })

  return NextResponse.json(apiEnvelope(assigned), { status: 201 })
}, { anyPermission: ['member.invite', 'member.remove'] })

// DELETE /api/memberships/:id/roles — Unassign role
export const DELETE = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const body = await request.json()
  const { roleId } = body as { roleId: string }

  if (!roleId) {
    return NextResponse.json({ error: 'roleId is required' }, { status: 400 })
  }

  const membership = await db.organizationMembership.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  // Cannot remove last owner
  const targetRole = await db.role.findFirst({ where: { id: roleId } })
  if (targetRole?.slug === 'owner') {
    const ownerAssignments = await db.membershipRole.findMany({
      where: {
        role: { slug: 'owner', organizationId: ctx.organizationId },
      },
    })
    if (ownerAssignments.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last Owner from an organization' },
        { status: 403 }
      )
    }
  }

  const assignment = await db.membershipRole.findFirst({
    where: { membershipId: id, roleId },
  })
  if (!assignment) {
    return NextResponse.json({ error: 'Role not assigned to this member' }, { status: 404 })
  }

  await db.membershipRole.deleteMany({ where: { membershipId: id, roleId } })

  return NextResponse.json({ data: { unassigned: true } })
}, { anyPermission: ['member.invite', 'member.remove'] })
