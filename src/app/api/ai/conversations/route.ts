/**
 * MIANX.AI — Conversations API
 * GET /api/ai/conversations — List user's conversations
 * DELETE /api/ai/conversations — Archive a conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { listConversations, archiveConversation, getUsageStats } from '@/ai'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/ai/conversations — List conversations for current user */
export const GET = withAuth(async (_request, ctx) => {
  const conversations = await listConversations(ctx.organizationId, ctx.user.id)
  return NextResponse.json(apiEnvelope(conversations))
}, { permission: 'domain.view' })

/** DELETE /api/ai/conversations — Archive a conversation by ID in body */
export const DELETE = withAuth(async (request, ctx) => {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json(apiEnvelope(null, 'id is required'), { status: 400 })

    const result = await archiveConversation(id, ctx.organizationId)
    return NextResponse.json(apiEnvelope(result, 'Conversation archived'))
  } catch (error) {
    console.error('[DELETE /api/ai/conversations]', error)
    return NextResponse.json(apiEnvelope(null, 'Failed to archive conversation'), { status: 400 })
  }
}, { permission: 'domain.view' })
