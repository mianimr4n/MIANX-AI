// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Feed [id] API
// ══════════════════════════════════════════════════════

import { withAuthParams } from '@/core/authorization/middleware'
import * as feedService from '@/domains/poultry/services/feed-service'

export const DELETE = withAuthParams(async (_request, ctx, { id }) => {
  return feedService.deleteFeedRecord(ctx.organizationId, id)
}, { permission: 'poultry.feed.delete' })
