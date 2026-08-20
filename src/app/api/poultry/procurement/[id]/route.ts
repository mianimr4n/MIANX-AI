// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Procurement [id] API
// ══════════════════════════════════════════════════════

import { withAuthParams } from '@/core/authorization/middleware'
import * as procurementService from '@/domains/poultry/services/procurement-service'

export const PATCH = withAuthParams(async (request, ctx, { id }) => {
  const body = await request.json()
  return procurementService.updateProcurement(ctx.organizationId, id, body)
}, { permission: 'poultry.procurement.update' })

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return procurementService.deleteProcurement(ctx.organizationId, id)
}, { permission: 'poultry.procurement.delete' })
