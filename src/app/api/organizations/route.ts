// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organizations API
// GET  /api/organizations  — List user's organizations (requires auth)
// POST /api/organizations  — Create organization (requires auth)
// ══════════════════════════════════════════════════════════════════
// Phase 28: Neither route uses withAuth() — that helper unconditionally
// requires an X-Organization-Id header before invoking the handler,
// which made it impossible to ever list an empty org list or create
// your first organization. Both routes resolve the authenticated user directly.
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/core/authorization'
import { slugify } from '@/core/tenancy/utils'
import { provisionDefaultRoles } from '@/core/tenancy/provision-roles'
import { provisionFreeSubscription } from '@/core/billing/provision-free'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(rawLimit, 1), 100)

  const { resolveCurrentUser, getUserOrganizations } = await import('@/core/authorization')
  const user = await resolveCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const orgs = await getUserOrganizations(user.id)
    return NextResponse.json({ data: orgs.slice(0, limit) })
  } catch (error) {
    console.error('[GET /api/organizations]', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}

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

  // OrganizationMembership.userId is a foreign key to Profile.userId, NOT
  // directly to the Supabase auth user — so a Profile row must exist first.
  // Nothing else provisions one on a user's own first login/signup (only
  // the member-invite path does), so self-serve org creation was failing
  // with a P2003 foreign key violation on OrganizationMembership_userId_fkey
  // for every brand-new user. Upsert is safe/idempotent for existing users.
  await db.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      displayName: user.email ? user.email.split('@')[0] : `User ${user.id.slice(0, 6)}`,
    },
  })

  const membership = await db.organizationMembership.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      status: 'active',
    },
  })

  const { ownerRoleId } = await provisionDefaultRoles(organization.id)
  await db.membershipRole.create({
    data: { membershipId: membership.id, roleId: ownerRoleId },
  })

  // Every organization starts with the active Free plan so the first session
  // has a valid entitlement state before the customer chooses to upgrade.
  try {
    await provisionFreeSubscription(organization.id)
  } catch (error) {
    // Do not silently create a partially-provisioned commercial tenant.
    // The organization and membership remain inspectable for remediation.
    console.error('[POST /api/organizations] free subscription provisioning failed', error)
    return NextResponse.json(
      { error: 'Organization created but billing setup could not be completed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: organization }, { status: 201 })
})
