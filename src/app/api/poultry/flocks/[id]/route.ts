// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Flock [id] API
// ══════════════════════════════════════════════════════

import { withAuthParams } from '@/core/authorization/middleware'
import * as flockService from '@/domains/poultry/services/flock-service'

export const GET = withAuthParams(async (_request, ctx, { id }) => {
  return flockService.getFlock(ctx.organizationId, id)
}, { permission: 'poultry.flock.view' })

export const PATCH = withAuthParams(async (request, ctx, { id }) => {
  const body = await request.json()
  return flockService.updateFlock(ctx.organizationId, id, body)
}, { permission: 'poultry.flock.update' })
