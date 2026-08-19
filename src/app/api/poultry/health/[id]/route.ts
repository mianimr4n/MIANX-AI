// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Health [id] API
// ══════════════════════════════════════════════════════

import { withAuthParams } from '@/core/authorization/middleware'
import * as healthService from '@/domains/poultry/services/health-service'

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return healthService.deleteHealthRecord(ctx.organizationId, id)
}, { permission: 'poultry.health.delete' })
