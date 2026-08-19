// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Sale [id] API
// ══════════════════════════════════════════════════════

import { withAuthParams } from '@/core/authorization/middleware'
import * as salesService from '@/domains/poultry/services/sales-service'

export const PATCH = withAuthParams(async (request, ctx, { id }) => {
  const body = await request.json()
  return salesService.updateSale(ctx.organizationId, id, body)
}, { permission: 'poultry.sale.update' })

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return salesService.deleteSale(ctx.organizationId, id)
}, { permission: 'poultry.sale.delete' })
