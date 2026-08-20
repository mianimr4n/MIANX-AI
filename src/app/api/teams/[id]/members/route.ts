// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Team Members API
// GET    /api/teams/:id/members  — List team members
// POST   /api/teams/:id/members  — Add member to team
// DELETE /api/teams/:id/members  — Remove member from team
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'
import { parsePagination, prismaPagination } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

// GET /api/teams/:id/members — List members (paginated)
export const GET = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const team = await db.team.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const pagination = parsePagination(request.nextUrl.searchParams)
  const { skip, take } = prismaPagination(pagination)

  const [members, total] = await Promise.all([
    db.teamMember.findMany({
      where: { teamId: id },
      skip,
      take,
      include: {
        membership: {
          include: {
            profile: { select: { displayName: true, avatarUrl: true, userId: true } },
            roles: { include: { role: { select: { name: true, slug: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.teamMember.count({ where: { teamId: id } }),
  ])

  return NextResponse.json({
    ...apiEnvelope(members),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
      hasMore: pagination.page < Math.ceil(total / pagination.pageSize),
    },
  })
}, { anyPermission: ['team.view', 'organization.view'] })

// POST /api/teams/:id/members — Add member to team
export const POST = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const team = await db.team.findFirst({
    where: { id, organizationId: ctx.organizationId },
  })
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  const body = await request.json()
  const { membershipId } = body

  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId is required' }, { status: 400 })
  }

  // Verify the membership belongs to the same org
  const membership = await db.organizationMembership.findFirst({
    where: { id: membershipId, organizationId: ctx.organizationId },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Membership not found in this organization' }, { status: 404 })
  }

  // Check not already in team
  const existing = await db.teamMember.findFirst({
    where: { teamId: id, membershipId },
  })
  if (existing) {
    return NextResponse.json({ error: 'Member already in this team' }, { status: 409 })
  }

  const teamMember = await db.teamMember.create({
    data: { teamId: id, membershipId },
  })

  return NextResponse.json(apiEnvelope(teamMember), { status: 201 })
}, { permission: 'team.manage' })

// DELETE /api/teams/:id/members — Remove member from team
export const DELETE = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const body = await request.json()
  const { membershipId } = body

  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId is required' }, { status: 400 })
  }

  const teamMember = await db.teamMember.findFirst({
    where: { teamId: id, membershipId },
  })
  if (!teamMember) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  }

  await db.teamMember.delete({ where: { id: teamMember.id } })

  return NextResponse.json({ data: { removed: true } })
}, { permission: 'team.manage' })
