// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Flocks API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as flockService from '@/domains/poultry/services/flock-service'

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
    if (!body.flockId || !body.date || !body.count || !body.cause) {
      return NextResponse.json({ error: 'flockId, date, count, and cause are required' }, { status: 400 })
    }
    return flockService.recordMortality(ctx.organizationId, body.flockId, body)
  }

  if (!body.shedId || !body.breed || !body.placementDate || !body.quantity) {
    return NextResponse.json({ error: 'shedId, breed, placementDate, and quantity are required' }, { status: 400 })
  }
  return flockService.createFlock(ctx.organizationId, body)
}, { permission: 'poultry.flock.create' })
