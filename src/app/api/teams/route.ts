// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Teams API
// GET    /api/teams           — List teams in organization
// POST   /api/teams           — Create a team
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/teams — List organization's teams with member counts
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const { searchParams } = request.nextUrl
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(rawLimit, 1), 100)

  const teams = await db.team.findMany({
    where: { organizationId: ctx.organizationId },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { members: true } },
      members: {
        include: {
          membership: {
            include: {
              profile: { select: { displayName: true, avatarUrl: true } },
              roles: { include: { role: { select: { name: true, slug: true } } } },
            },
          },
        },
        take: 5,
      },
    },
  })

  return NextResponse.json(apiEnvelope(teams))
}, { anyPermission: ['team.view', 'organization.view'] })

// POST /api/teams — Create a new team
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { name, description } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Team name is required (min 2 characters)' },
      { status: 400 }
    )
  }

  const team = await db.team.create({
    data: {
      organizationId: ctx.organizationId,
      name: name.trim(),
      description: description?.trim() || null,
    },
  })

  return NextResponse.json(apiEnvelope(team), { status: 201 })
}, { permission: 'team.create' })
