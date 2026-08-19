// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Shed [id] API
// ══════════════════════════════════════════════════════

import { withAuthParams } from '@/core/authorization/middleware'
import * as shedService from '@/domains/poultry/services/shed-service'

export const GET = withAuthParams(async (_request, ctx, { id }) => {
  return shedService.getShed(ctx.organizationId, id)
}, { permission: 'poultry.shed.view' })

export const PATCH = withAuthParams(async (request, ctx, { id }) => {
  const body = await request.json()
  return shedService.updateShed(ctx.organizationId, id, body)
}, { permission: 'poultry.shed.update' })

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return shedService.deleteShed(ctx.organizationId, id)
}, { permission: 'poultry.shed.delete' })
