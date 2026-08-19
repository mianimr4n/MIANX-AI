// ══════════════════════════════════════════
// MIANX.AI — Poultry Procurement API
// ══════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as procurementService from '@/domains/poultry/services/procurement-service'
import { validateCreateProcurement, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view === 'summary') {
    return procurementService.getProcurementSummary(ctx.organizationId, {
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    })
  }

  return procurementService.listProcurements(ctx.organizationId, {
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })
}, { permission: 'poultry.procurement.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const errors = validateCreateProcurement(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return procurementService.createProcurement(ctx.organizationId, body)
}, { permission: 'poultry.procurement.create' })
