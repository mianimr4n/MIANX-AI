// ══════════════════════════════════════════
// MIANX.AI — Poultry Production API
// ══════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as productionService from '@/domains/poultry/services/production-service'
import { validateCreateProductionRecord, formatValidationErrors } from '@/domains/poultry/validation'

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
  const errors = validateCreateProductionRecord(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return productionService.createProductionRecord(ctx.organizationId, body)
}, { permission: 'poultry.production.create' })
