// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Flock [id] API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuthParams } from '@/core/authorization/middleware'
import * as flockService from '@/domains/poultry/services/flock-service'
import { validateUpdateFlock, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuthParams(async (_request, ctx, { id }) => {
  return flockService.getFlock(ctx.organizationId, id)
}, { permission: 'poultry.flock.view' })

export const PATCH = withAuthParams(async (request, ctx, { id }) => {
  const body = await request.json()
  const errors = validateUpdateFlock(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return flockService.updateFlock(ctx.organizationId, id, body)
}, { permission: 'poultry.flock.update' })
