/**
 * MIANX.AI — Single Conversation API
 * GET    /api/ai/conversations/:id — Get conversation with messages
 * PATCH  /api/ai/conversations/:id — Update conversation title
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConversation, updateConversationTitle, archiveConversation } from '@/ai'
import { withAuthParams } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/ai/conversations/:id */
export const GET = withAuthParams(async (
  _request,
  ctx,
  { id }
) => {
  const conversation = await getConversation(id, ctx.organizationId)

  if (!conversation) {
    return NextResponse.json(apiEnvelope(null, 'Conversation not found'), { status: 404 })
  }

  return NextResponse.json(apiEnvelope(conversation))
}, { permission: 'ai.conversations.view' })

/** PATCH /api/ai/conversations/:id — Update title */
export const PATCH = withAuthParams(async (
  request,
  ctx,
  { id }
) => {
  try {
    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(apiEnvelope(null, 'title is required (non-empty string)'), { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json(apiEnvelope(null, 'Title too long (max 200 chars)'), { status: 400 })
    }

    const updated = await updateConversationTitle(id, ctx.organizationId, title.trim())
    return NextResponse.json(apiEnvelope(updated, 'Title updated'))
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update conversation'
    if (msg.includes('not found')) {
      return NextResponse.json(apiEnvelope(null, msg), { status: 404 })
    }
    console.error('[PATCH /api/ai/conversations/:id]', error)
    return NextResponse.json(apiEnvelope(null, msg), { status: 400 })
  }
}, { permission: 'ai.conversations.view' })
