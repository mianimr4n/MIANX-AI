// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Customers API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as salesService from '@/domains/poultry/services/sales-service'

export const GET = withAuth(async (_request, ctx) => {
  return salesService.listCustomers(ctx.organizationId)
}, { permission: 'poultry.sale.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  return salesService.createCustomer(ctx.organizationId, body)
}, { permission: 'poultry.sale.create' })
