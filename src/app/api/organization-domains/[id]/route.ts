// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Single Organization Domain API
// GET detail, PATCH configure, DELETE deactivate
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { deactivateDomain } from '@/core/domain'
import { withAuthParams } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/organization-domains/:id — Get org domain detail */
export const GET = withAuthParams(async (
  _request,
  ctx,
  { id }
) => {
  const orgDomain = await db.organizationDomain.findUnique({
    where: { id },
    include: {
      domain: true,
      organization: { select: { id: true, name: true } },
    },
  })

  if (!orgDomain || orgDomain.organizationId !== ctx.organizationId) {
    return NextResponse.json(apiEnvelope(null, 'Organization domain not found'), { status: 404 })
  }

  // Get active modules count
  const activeModules = await db.organizationModule.count({
    where: { organizationId: ctx.organizationId, module: { domainId: orgDomain.domainId }, status: 'active' },
  })

  return NextResponse.json(apiEnvelope({ ...orgDomain, activeModules }))
})

/** PATCH /api/organization-domains/:id — Update configuration */
export const PATCH = withAuthParams(async (
  request,
  ctx,
  { id }
) => {
  const orgDomain = await db.organizationDomain.findUnique({ where: { id } })
  if (!orgDomain || orgDomain.organizationId !== ctx.organizationId) {
    return NextResponse.json(apiEnvelope(null, 'Organization domain not found'), { status: 404 })
  }

  try {
    const body = await request.json()
    const { configuration, status } = body

    const updated = await db.organizationDomain.update({
      where: { id },
      data: {
        ...(configuration !== undefined ? { configuration: JSON.stringify(configuration) } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    })

    return NextResponse.json(apiEnvelope(updated))
  } catch (error) {
    console.error('[PATCH /api/organization-domains/:id]', error)
    return NextResponse.json(apiEnvelope(null, 'Invalid request body'), { status: 400 })
  }
}, { permission: 'domain.configure' })

/** DELETE /api/organization-domains/:id — Deactivate domain for org */
export const DELETE = withAuthParams(async (
  _request,
  ctx,
  { id }
) => {
  const result = await deactivateDomain(id, ctx.organizationId)

  if (!result.ok) {
    return NextResponse.json(apiEnvelope(null, result.error), {
      status: result.error.includes('not found') ? 404 : 403,
    })
  }

  return NextResponse.json(apiEnvelope(result.data, 'Domain deactivated for organization'))
}, { permission: 'domain.activate' })
