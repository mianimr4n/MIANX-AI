// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organizations API
// GET  /api/organizations  — List user's organizations (requires auth)
// POST /api/organizations  — Create organization (requires auth)
// ══════════════════════════════════════════════════════════════════
// Phase 28: Neither route uses withAuth() — that helper unconditionally
//   requires an X-Organization-Id header before invoking the handler,
//   which made it impossible to ever list an empty org list or create
//   your first organization ("Organization context required" error on
//   every signup). Both routes resolve the authenticated user directly
//   instead; org-scoped tenant isolation isn't relevant here since
//   neither route reads or writes data belonging to an existing org.
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/core/authorization'
import { slugify } from '@/core/tenancy/utils'
import { provisionDefaultRoles } from '@/core/tenancy/provision-roles'

export const dynamic = 'force-dynamic'

// GET /api/organizations — List user's organizations (requires auth, but NOT
// an existing org — same reasoning as POST below: a user with zero orgs must
// still be able to see that empty list, so this cannot go through withAuth,
// which unconditionally requires X-Organization-Id before calling the handler.
export const GET = async (request: NextRequest) => {
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
}

// POST /api/organizations — Create organization (requires an authenticated
// user, but NOT an existing org — this is how the user's first org gets
// created, so it cannot require X-Organization-Id like every other route.
// withAuth() unconditionally requires that header; using it here would make
// it impossible for anyone to ever create their first organization.
export const POST = withRateLimit(10, 60_000)(async (request: NextRequest) => {
  const { resolveCurrentUser } = await import('@/core/authorization')
  const user = await resolveCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

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
      userId: user.id,
      status: 'active',
    },
  })

  // Provision org-scoped Owner/Admin/Member/Viewer roles
  const { ownerRoleId } = await provisionDefaultRoles(organization.id)
  await db.membershipRole.create({
    data: { membershipId: membership.id, roleId: ownerRoleId },
  })

  return NextResponse.json({ data: organization }, { status: 201 })
})
