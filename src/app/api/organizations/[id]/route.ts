// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Single Organization API
// GET    /api/organizations/:id  — Get organization detail
// PATCH  /api/organizations/:id  — Update organization
// DELETE /api/organizations/:id  — Archive organization
//
// Phase 22: All methods now require auth + owner/admin membership.
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { AuthorizationError } from '@/core/authorization/auth-context'

export const dynamic = 'force-dynamic'

/** Verify the caller has owner or admin role in the target organization */
async function requireOrgAdmin(ctx: AuthContext, orgId: string): Promise<void> {
  if (ctx.organizationId !== orgId) {
    throw new AuthorizationError('You do not have access to this organization', 403)
  }
  const isAdmin = ctx.roles.some(r => r.slug === 'owner' || r.slug === 'admin')
  if (!isAdmin) {
    throw new AuthorizationError('Organization admin access required', 403)
  }
}

export const GET = withAuthParams(async (
  _request: NextRequest,
  ctx: AuthContext,
  { id }: { id: string }
) => {
  // Any active member can view their own org
  if (ctx.organizationId !== id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { memberships: true, teams: true, settings: true, auditLogs: true } },
      domains: { include: { domain: true } },
    },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  return NextResponse.json({ data: org })
}, { anyPermission: ['organization.view', 'organization.manage'] })

export const PATCH = withAuthParams(async (
  request: NextRequest,
  ctx: AuthContext,
  { id }: { id: string }
) => {
  await requireOrgAdmin(ctx, id)

  const body = await request.json()
  const { name, timezone, locale, currency, status } = body

  const org = await db.organization.update({
    where: { id },
    data: {
      ...(name && typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      ...(timezone ? { timezone } : {}),
      ...(locale ? { locale } : {}),
      ...(currency ? { currency } : {}),
      ...(status && ['active', 'suspended', 'trial', 'archived'].includes(status) ? { status } : {}),
    },
  })

  return NextResponse.json({ data: org })
}, { permission: 'organization.manage' })

export const DELETE = withAuthParams(async (
  _request: NextRequest,
  ctx: AuthContext,
  { id }: { id: string }
) => {
  await requireOrgAdmin(ctx, id)

  await db.organization.update({
    where: { id },
    data: { status: 'archived' },
  })
  return NextResponse.json({ data: { id, status: 'archived' } })
}, { permission: 'organization.manage' })
