// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Role Detail API
// GET    /api/roles/:id           — Get role with permissions
// PATCH  /api/roles/:id           — Update role (non-system only)
// DELETE /api/roles/:id           — Delete custom role
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/roles/:id
export const GET = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const role = await db.role.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      permissions: {
        include: { permission: { select: { key: true, description: true } } },
      },
      _count: { select: { memberships: true } },
    },
  })

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  return NextResponse.json(apiEnvelope({
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    isSystem: role.isSystem,
    memberCount: role._count.memberships,
    permissions: role.permissions.map(rp => rp.permission),
  }))
}, { anyPermission: ['member.view', 'organization.view'] })

// PATCH /api/roles/:id — Update role metadata
export const PATCH = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const role = await db.role.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, description, permissionKeys } = body

  // System roles: only allow description update
  if (role.isSystem && (name || permissionKeys)) {
    return NextResponse.json(
      { error: 'System roles can only have their description updated' },
      { status: 403 }
    )
  }

  const updated = await db.role.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
    },
  })

  // Update permissions if provided (non-system only)
  if (!role.isSystem && Array.isArray(permissionKeys)) {
    await db.rolePermission.deleteMany({ where: { roleId: id } })
    const perms = await db.permission.findMany({
      where: { key: { in: permissionKeys } },
    })
    if (perms.length > 0) {
      await Promise.all(
        perms.map(p =>
          db.rolePermission.create({
            data: { roleId: id, permissionId: p.id },
          })
        )
      )
    }
  }

  return NextResponse.json(apiEnvelope(updated))
}, { adminOnly: true })

// DELETE /api/roles/:id — Delete custom role (system roles protected)
export const DELETE = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const role = await db.role.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  if (role.isSystem) {
    return NextResponse.json(
      { error: 'System roles cannot be deleted' },
      { status: 403 }
    )
  }

  const assignments = await db.membershipRole.count({ where: { roleId: id } })
  if (assignments > 0) {
    return NextResponse.json(
      { error: `Cannot delete role: ${assignments} member(s) still assigned` },
      { status: 409 }
    )
  }

  await db.rolePermission.deleteMany({ where: { roleId: id } })
  await db.role.delete({ where: { id } })

  return NextResponse.json({ data: { deleted: true } })
}, { adminOnly: true })
