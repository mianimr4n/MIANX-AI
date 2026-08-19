// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Sheds API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as shedService from '@/domains/poultry/services/shed-service'
import { validateCreateShed, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  return shedService.listSheds(ctx.organizationId, {
    farmId: searchParams.get('farmId') || undefined,
    status: searchParams.get('status') || undefined,
  })
}, { permission: 'poultry.shed.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const errors = validateCreateShed(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return shedService.createShed(ctx.organizationId, body)
}, { permission: 'poultry.shed.create' })
