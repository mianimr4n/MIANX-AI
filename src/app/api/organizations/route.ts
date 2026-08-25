// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organizations API
// GET  /api/organizations  — List user's organizations (requires auth)
// POST /api/organizations  — Create organization (requires auth)
// ══════════════════════════════════════════════════════════════════
// Phase 22: GET now ALWAYS requires authentication (dev and prod).
//   Dev users must pass X-Dev-User-Id + X-Dev-Org-Id headers (handled
//   by the auth middleware's dev-mode bypass).
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit } from '@/core/authorization'
import { slugify } from '@/core/tenancy/utils'
import { provisionDefaultRoles } from '@/core/tenancy/provision-roles'

export const dynamic = 'force-dynamic'

// GET /api/organizations — List user's organizations (always auth required)
export const GET = withAuth(async (request: NextRequest) => {
  // At this point, middleware has resolved ctx — but we need to get orgs for the user.
  // Use the withAuth wrapper which provides ctx, but we need the raw user ID.
  // We re-import to get user orgs from the auth context.
  const { searchParams } = request.nextUrl
  const cursor = searchParams.get('cursor')
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(rawLimit, 1), 100)

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
})

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

  // Provision org-scoped Owner/Admin/Member/Viewer roles
  const { ownerRoleId } = await provisionDefaultRoles(organization.id)
  await db.membershipRole.create({
    data: { membershipId: membership.id, roleId: ownerRoleId },
  })

  return NextResponse.json({ data: organization }, { status: 201 })
}))
