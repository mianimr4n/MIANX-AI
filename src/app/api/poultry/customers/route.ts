// ══════════════════════════════════════════
// MIANX.AI — Poultry Customers API
// ══════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as salesService from '@/domains/poultry/services/sales-service'
import { validateCreateCustomer, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuth(async (_request, ctx) => {
  return salesService.listCustomers(ctx.organizationId)
}, { permission: 'poultry.sale.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const errors = validateCreateCustomer(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return salesService.createCustomer(ctx.organizationId, body)
}, { permission: 'poultry.sale.create' })
