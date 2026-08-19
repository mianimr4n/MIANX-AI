// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Shed [id] API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuthParams } from '@/core/authorization/middleware'
import * as shedService from '@/domains/poultry/services/shed-service'
import { validateUpdateShed, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuthParams(async (_request, ctx, { id }) => {
  return shedService.getShed(ctx.organizationId, id)
}, { permission: 'poultry.shed.view' })

export const PATCH = withAuthParams(async (request, ctx, { id }) => {
  const body = await request.json()
  const errors = validateUpdateShed(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return shedService.updateShed(ctx.organizationId, id, body)
}, { permission: 'poultry.shed.update' })

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return shedService.deleteShed(ctx.organizationId, id)
}, { permission: 'poultry.shed.delete' })
