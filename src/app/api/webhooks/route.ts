// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Webhooks API
// GET    /api/webhooks        — List webhooks
// POST   /api/webhooks        — Create a webhook
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { createWebhook, listWebhooks } from '@/core/integration'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/webhooks — List webhooks (secret never returned)
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const webhooks = await listWebhooks(ctx.organizationId)
  return NextResponse.json(apiEnvelope(webhooks))
}, { anyPermission: ['integration.webhooks.view', 'integration.webhooks.manage'] })

// POST /api/webhooks — Create a webhook
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { name, url, eventTypes, secret } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'name is required (min 2 characters)' }, { status: 400 })
  }

  if (!url || typeof url !== 'string') {
    try { new URL(url) } catch {
      return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 })
    }
  }

  // Validate URL format
  try { new URL(url) } catch {
    return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 })
  }

  if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
    return NextResponse.json(
      { error: 'eventTypes is required and must be a non-empty array (use ["*"] for all events)' },
      { status: 400 },
    )
  }

  const result = await createWebhook({
    organizationId: ctx.organizationId,
    name: name.trim(),
    url,
    eventTypes,
    secret: typeof secret === 'string' ? secret : undefined,
  })

  return NextResponse.json(apiEnvelope(result), { status: 201 })
}, { permission: 'integration.webhooks.manage' })
