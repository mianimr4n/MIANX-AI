// ══════════════════════════════════════════
// MIANX.AI — Poultry Sales API
// ══════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as salesService from '@/domains/poultry/services/sales-service'
import { validateCreateSale, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view === 'summary') {
    return salesService.getSalesSummary(ctx.organizationId, {
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    })
  }

  return salesService.listSales(ctx.organizationId, {
    status: searchParams.get('status') || undefined,
    customerId: searchParams.get('customerId') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })
}, { permission: 'poultry.sale.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const errors = validateCreateSale(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return salesService.createSale(ctx.organizationId, body)
}, { permission: 'poultry.sale.create' })
