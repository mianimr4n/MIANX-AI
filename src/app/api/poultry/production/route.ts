// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Production API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as productionService from '@/domains/poultry/services/production-service'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view === 'summary') {
    return productionService.getProductionSummary(ctx.organizationId, {
      flockId: searchParams.get('flockId') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    })
  }

  return productionService.listProductionRecords(ctx.organizationId, {
    flockId: searchParams.get('flockId') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })
}, { permission: 'poultry.production.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  if (!body.flockId || !body.date) {
    return NextResponse.json({ error: 'flockId and date are required' }, { status: 400 })
  }
  return productionService.createProductionRecord(ctx.organizationId, body)
}, { permission: 'poultry.production.create' })
