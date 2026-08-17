// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Team Detail API
// GET    /api/teams/:id      — Get team details
// PATCH  /api/teams/:id      — Update team
// DELETE /api/teams/:id      — Delete team
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/teams/:id
export const GET = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const team = await db.team.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      members: {
        include: {
          membership: {
            include: {
              profile: { select: { displayName: true, avatarUrl: true, userId: true } },
              roles: { include: { role: { select: { name: true, slug: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  return NextResponse.json(apiEnvelope(team))
}, { anyPermission: ['team.view', 'organization.view'] })

// PATCH /api/teams/:id
export const PATCH = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const body = await request.json()
  const { name, description } = body

  const team = await db.team.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const updated = await db.team.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
    },
  })

  return NextResponse.json(apiEnvelope(updated))
}, { anyPermission: ['team.manage', 'team.create'] })

// DELETE /api/teams/:id
export const DELETE = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const team = await db.team.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  await db.teamMember.deleteMany({ where: { teamId: id } })
  await db.team.delete({ where: { id } })

  return NextResponse.json({ data: { deleted: true } })
}, { anyPermission: ['team.manage', 'team.create'] })
