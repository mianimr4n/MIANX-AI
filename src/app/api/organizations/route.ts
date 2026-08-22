// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organizations API
// GET  /api/organizations  — List user's organizations (requires auth in production)
// POST /api/organizations  — Create organization (requires auth)
// ══════════════════════════════════════════════════════════════════
// Phase 19: GET requires authentication. In production, anonymous users
//   cannot list all organizations. In development, the route returns all
//   organizations for convenience (dev-mode headers or unauthenticated).
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit } from '@/core/authorization'
import { slugify } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/organizations — List organizations
// Phase 19: In production, require authentication.
//   In development, allow unauthenticated access for convenience.
export async function GET(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'

  // Production: require valid Supabase session
  if (isProd) {
    const { resolveCurrentUser, getUserOrganizations } = await import('@/core/authorization')
    const user = await resolveCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    try {
      const orgs = await getUserOrganizations(user.id)
      return NextResponse.json({ data: orgs })
    } catch (error) {
      console.error('[GET /api/organizations]', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }
  }

  // Development: list all organizations (no auth required)
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
    const limit = Math.min(Math.max(rawLimit, 1), 100)
    const cursor = searchParams.get('cursor')

    const organizations = await db.organization.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { memberships: true, teams: true, auditLogs: true },
        },
      },
    })

    const hasMore = organizations.length > limit
    const items = hasMore ? organizations.slice(0, limit) : organizations
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({
      data: items,
      meta: { page, limit, hasMore, nextCursor },
    })
  } catch (error) {
    console.error('[GET /api/organizations]', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}

// POST /api/organizations — Create organization (always requires auth)
export const POST = withRateLimit(10, 60_000)(withAuth(async (request, ctx) => {
  const body = await request.json()
  const { name, timezone, locale, currency } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Organization name is required (min 2 characters)' },
      { status: 400 }
    )
  }

  const slug = slugify(name)

  // Check slug uniqueness
  const existing = await db.organization.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json(
      { error: 'Organization with this name already exists' },
      { status: 409 }
    )
  }

  const organization = await db.organization.create({
    data: {
      name: name.trim(),
      slug,
      timezone: timezone || 'UTC',
      locale: locale || 'en',
      currency: currency || 'USD',
    },
  })

  // Auto-create owner membership for the creator
  const membership = await db.organizationMembership.create({
    data: {
      organizationId: organization.id,
      userId: ctx.user.id,
      status: 'active',
    },
  })

  // Assign owner role
  const ownerRole = await db.role.findFirst({
    where: { slug: 'owner' },
  })
  if (ownerRole) {
    await db.membershipRole.create({
      data: { membershipId: membership.id, roleId: ownerRole.id },
    })
  }

  return NextResponse.json({ data: organization }, { status: 201 })
}))
