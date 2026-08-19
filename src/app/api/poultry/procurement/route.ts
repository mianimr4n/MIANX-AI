// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Procurement API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as procurementService from '@/domains/poultry/services/procurement-service'

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
  if (!body.type || !body.supplier || !body.description || !body.quantity) {
    return NextResponse.json({ error: 'type, supplier, description, and quantity are required' }, { status: 400 })
  }
  return procurementService.createProcurement(ctx.organizationId, body)
}, { permission: 'poultry.procurement.create' })
