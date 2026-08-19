// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Farms API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as farmService from '@/domains/poultry/services/farm-service'
import { validateCreateFarm, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  return farmService.listFarms(ctx.organizationId, {
    status: searchParams.get('status') || undefined,
  })
}, { permission: 'poultry.farm.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const errors = validateCreateFarm(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return farmService.createFarm(ctx.organizationId, body)
}, { permission: 'poultry.farm.create' })
