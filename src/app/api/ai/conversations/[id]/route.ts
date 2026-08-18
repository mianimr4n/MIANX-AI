/**
 * MIANX.AI — Single Conversation API
 * GET /api/ai/conversations/:id — Get conversation with messages
 */

import { NextResponse } from 'next/server'
import { getConversation } from '@/ai'
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
}, { permission: 'domain.view' })
