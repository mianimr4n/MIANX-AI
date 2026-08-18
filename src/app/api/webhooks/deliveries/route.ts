// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Webhook Deliveries API
// GET    /api/webhooks/deliveries   — List delivery history
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { listWebhookDeliveries } from '@/core/integration'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/webhooks/deliveries
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const { searchParams } = request.nextUrl
  const webhookId = searchParams.get('webhookId') || undefined
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20))

  const result = await listWebhookDeliveries(ctx.organizationId, webhookId, page, pageSize)

  return NextResponse.json(
    apiEnvelope(result.data, {
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    }),
  )
}, { anyPermission: ['integration.webhooks.view', 'integration.webhooks.manage'] })
