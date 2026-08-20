// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Production [id] API
// ══════════════════════════════════════════════════════

import { withAuthParams } from '@/core/authorization/middleware'
import * as productionService from '@/domains/poultry/services/production-service'

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return productionService.deleteProductionRecord(ctx.organizationId, id)
}, { permission: 'poultry.production.delete' })
