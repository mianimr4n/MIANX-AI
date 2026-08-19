// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Farm [id] API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuthParams } from '@/core/authorization/middleware'
import * as farmService from '@/domains/poultry/services/farm-service'
import { validateUpdateFarm, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuthParams(async (_request, ctx, { id }) => {
  return farmService.getFarm(ctx.organizationId, id)
}, { permission: 'poultry.farm.view' })

export const PATCH = withAuthParams(async (request, ctx, { id }) => {
  const body = await request.json()
  const errors = validateUpdateFarm(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return farmService.updateFarm(ctx.organizationId, id, body)
}, { permission: 'poultry.farm.update' })

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return farmService.deleteFarm(ctx.organizationId, id)
}, { permission: 'poultry.farm.delete' })