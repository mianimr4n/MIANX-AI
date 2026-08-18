/**
 * MIANX.AI — AI Usage API
 * GET /api/ai/usage — Get AI usage statistics for the org
 */

import { NextResponse } from 'next/server'
import { getUsageStats } from '@/ai'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/ai/usage */
export const GET = withAuth(async (_request, ctx) => {
  const stats = await getUsageStats(ctx.organizationId)
  return NextResponse.json(apiEnvelope(stats))
}, { permission: 'ai.usage.admin' })
