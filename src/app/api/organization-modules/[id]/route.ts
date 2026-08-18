// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Single Organization Module API
// GET detail, PATCH configure, DELETE deactivate
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { deactivateModule } from '@/core/domain'
import { withAuthParams } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/organization-modules/:id — Get org module detail */
export const GET = withAuthParams(async (
  _request,
  ctx,
  { id }
) => {
  const orgModule = await db.organizationModule.findUnique({
    where: { id },
    include: {
      module: { include: { domain: { select: { id: true, name: true, slug: true } } } },
      organization: { select: { id: true, name: true } },
    },
  })

  if (!orgModule || orgModule.organizationId !== ctx.organizationId) {
    return NextResponse.json(apiEnvelope(null, 'Organization module not found'), { status: 404 })
  }

  return NextResponse.json(apiEnvelope(orgModule))
})

/** PATCH /api/organization-modules/:id — Update configuration */
export const PATCH = withAuthParams(async (
  request,
  ctx,
  { id }
) => {
  const orgModule = await db.organizationModule.findUnique({ where: { id } })
  if (!orgModule || orgModule.organizationId !== ctx.organizationId) {
    return NextResponse.json(apiEnvelope(null, 'Organization module not found'), { status: 404 })
  }

  try {
    const body = await request.json()
    const { configuration, status } = body

    const updated = await db.organizationModule.update({
      where: { id },
      data: {
        ...(configuration !== undefined ? { configuration: JSON.stringify(configuration) } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    })

    return NextResponse.json(apiEnvelope(updated))
  } catch (error) {
    console.error('[PATCH /api/organization-modules/:id]', error)
    return NextResponse.json(apiEnvelope(null, 'Invalid request body'), { status: 400 })
  }
}, { permission: 'domain.configure' })

/** DELETE /api/organization-modules/:id — Deactivate module for org */
export const DELETE = withAuthParams(async (
  _request,
  ctx,
  { id }
) => {
  const result = await deactivateModule(id, ctx.organizationId)

  if (!result.ok) {
    return NextResponse.json(apiEnvelope(null, result.error), {
      status: result.error.includes('not found') ? 404 : 403,
    })
  }

  return NextResponse.json(apiEnvelope(result.data, 'Module deactivated for organization'))
}, { permission: 'domain.activate' })
