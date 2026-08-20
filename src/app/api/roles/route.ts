// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Roles API
// GET  /api/roles  — List organization's roles with permissions
// POST /api/roles  — Create custom role (admin only)
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'
import { slugify } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/roles — List org roles with their permissions
// Note: Roles table is small per-organization. Safety cap of 200 prevents abuse.
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const roles = await db.role.findMany({
    where: { organizationId: ctx.organizationId },
    take: 200,
    include: {
      permissions: {
        include: { permission: { select: { key: true, description: true } } },
      },
      _count: { select: { memberships: true } },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })

  const formatted = roles.map(role => ({
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    isSystem: role.isSystem,
    memberCount: role._count.memberships,
    permissions: role.permissions.map(rp => rp.permission),
  }))

  return NextResponse.json(apiEnvelope(formatted))
}, { anyPermission: ['member.view', 'organization.view'] })

// POST /api/roles — Create custom role (admin only)
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { name, description, permissionKeys } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Role name is required (min 2 characters)' },
      { status: 400 }
    )
  }

  const slug = slugify(name)

  // Check uniqueness within org
  const existing = await db.role.findFirst({
    where: { organizationId: ctx.organizationId, slug },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Role with this name already exists' },
      { status: 409 }
    )
  }

  const role = await db.role.create({
    data: {
      organizationId: ctx.organizationId,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      isSystem: false,
    },
  })

  // Assign permissions if provided
  if (Array.isArray(permissionKeys) && permissionKeys.length > 0) {
    const perms = await db.permission.findMany({
      where: { key: { in: permissionKeys } },
    })
    await Promise.all(
      perms.map(p =>
        db.rolePermission.create({
          data: { roleId: role.id, permissionId: p.id },
        })
      )
    )
  }

  return NextResponse.json(apiEnvelope(role), { status: 201 })
}, { adminOnly: true })
