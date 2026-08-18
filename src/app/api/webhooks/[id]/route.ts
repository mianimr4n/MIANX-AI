// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Webhook Detail API
// GET    /api/webhooks/:id   — Get webhook detail
// PATCH  /api/webhooks/:id   — Update webhook
// DELETE /api/webhooks/:id   — Delete webhook
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { getWebhook, updateWebhook, deleteWebhook } from '@/core/integration'
import type { UpdateWebhookData } from '@/core/integration'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/webhooks/:id
export const GET = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const webhook = await getWebhook(id, ctx.organizationId)
  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }
  return NextResponse.json(apiEnvelope(webhook))
}, { anyPermission: ['integration.webhooks.view', 'integration.webhooks.manage'] })

// PATCH /api/webhooks/:id
export const PATCH = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const existing = await getWebhook(id, ctx.organizationId)
  if (!existing) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, url, eventTypes, secret, status } = body

  const updateData: UpdateWebhookData = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'name must be at least 2 characters' }, { status: 400 })
    }
    updateData.name = name.trim()
  }
  if (url !== undefined) {
    try { new URL(url) } catch {
      return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 })
    }
    updateData.url = url
  }
  if (eventTypes !== undefined) {
    if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
      return NextResponse.json({ error: 'eventTypes must be a non-empty array' }, { status: 400 })
    }
    updateData.eventTypes = eventTypes
  }
  if (secret !== undefined) {
    if (typeof secret !== 'string' || secret.length < 10) {
      return NextResponse.json({ error: 'secret must be at least 10 characters' }, { status: 400 })
    }
    updateData.secret = secret
  }
  if (status !== undefined) {
    if (!['active', 'disabled'].includes(status)) {
      return NextResponse.json({ error: "status must be 'active' or 'disabled'" }, { status: 400 })
    }
    updateData.status = status
  }

  const updated = await updateWebhook(id, ctx.organizationId, updateData)
  return NextResponse.json(apiEnvelope(updated))
}, { permission: 'integration.webhooks.manage' })

// DELETE /api/webhooks/:id
export const DELETE = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const existing = await getWebhook(id, ctx.organizationId)
  if (!existing) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  await deleteWebhook(id, ctx.organizationId)
  return NextResponse.json(apiEnvelope({ deleted: true }))
}, { permission: 'integration.webhooks.manage' })
