/**
 * MIANX.AI — AI Chat API
 * POST /api/ai/chat — Send a message and get streaming response
 */

import { NextResponse } from 'next/server'
import { sendMessage } from '@/ai'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

export const POST = withAuth(async (request, ctx) => {
  try {
    const body = await request.json()
    const { message, conversationId, agentSlug, model } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(apiEnvelope(null, 'message is required'), { status: 400 })
    }

    if (message.length > 32000) {
      return NextResponse.json(apiEnvelope(null, 'Message too long (max 32K characters)'), { status: 400 })
    }

    const { conversationId: convId, stream } = await sendMessage(
      message,
      {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        membershipId: ctx.membershipId,
        roles: ctx.roles.map(r => r.slug),
        permissions: ctx.permissions,
      },
      {
        conversationId,
        model,
        metadata: agentSlug ? { agentSlug } : undefined,
      }
    )

    // Return the stream as a response
    return stream.toDataStreamResponse({
      headers: {
        'X-Conversation-Id': convId,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'AI chat failed'
    // If no providers configured, return a helpful message
    if (msg.includes('No AI providers configured')) {
      return NextResponse.json(apiEnvelope(null, 'No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env'), { status: 503 })
    }
    console.error('[POST /api/ai/chat]', error)
    return NextResponse.json(apiEnvelope(null, msg), { status: 500 })
  }
}, { permission: 'ai.chat' })
