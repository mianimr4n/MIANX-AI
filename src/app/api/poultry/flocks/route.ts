// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Flocks API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as flockService from '@/domains/poultry/services/flock-service'
import { validateCreateFlock, validateRecordMortality, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  // Metrics view
  if (view === 'metrics' && searchParams.get('flockId')) {
    return flockService.getFlockMetrics(ctx.organizationId, searchParams.get('flockId')!)
  }

  return flockService.listFlocks(ctx.organizationId, {
    shedId: searchParams.get('shedId') || undefined,
    status: searchParams.get('status') || undefined,
    breed: searchParams.get('breed') || undefined,
  })
}, { permission: 'poultry.flock.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()

  // Mortality recording endpoint
  if (body._action === 'record_mortality') {
    const errors = validateRecordMortality(body)
    if (errors.length > 0) {
      return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
    }
    return flockService.recordMortality(ctx.organizationId, body.flockId, body)
  }

  const errors = validateCreateFlock(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return flockService.createFlock(ctx.organizationId, body)
}, { permission: 'poultry.flock.create' })
