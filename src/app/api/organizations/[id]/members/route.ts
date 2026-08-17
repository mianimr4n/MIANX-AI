// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organization Members API
// GET   /api/organizations/:id/members  — List members
// POST  /api/organizations/:id/members  — Add member
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/organizations/:id/members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const members = await db.organizationMembership.findMany({
      where: { organizationId: id },
      include: {
        profile: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: members })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

// POST /api/organizations/:id/members — Invite a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, roleSlug } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Check org exists
    const org = await db.organization.findUnique({ where: { id } })
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if already a member
    const existing = await db.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: id, userId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
    }

    // Create profile if not exists
    await db.profile.upsert({
      where: { userId },
      update: {},
      create: { userId, displayName: `User ${userId.slice(0, 6)}` },
    })

    // Create membership
    const membership = await db.organizationMembership.create({
      data: {
        organizationId: id,
        userId,
        status: 'invited',
        joinedAt: new Date(),
      },
    })

    // Assign role if provided
    if (roleSlug) {
      const role = await db.role.findFirst({
        where: { organizationId: id, slug: roleSlug }
      })
      if (role) {
        await db.membershipRole.create({
          data: { membershipId: membership.id, roleId: role.id },
        })
      }
    }

    return NextResponse.json({ data: membership }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}
