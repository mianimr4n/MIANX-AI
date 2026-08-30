/**
 * MIANX.AI — AI Chat API
 * POST /api/ai/chat — Send a message and get streaming response
 * Rate limited (30 req/min per org+client), token budget, input validation
 */

import { NextResponse } from 'next/server'
import { sendMessage } from '@/ai'
import { getUsageStats } from '@/ai/memory'
import { withOrgRateLimit } from '@/core/authorization/org-rate-limit'
import { apiEnvelope } from '@/core/tenancy/utils'

const MONTHLY_TOKEN_BUDGET = 1_000_000

export const POST = withOrgRateLimit(
  30,
  60_000,
  async (request, ctx) => {
    try {
      const body = await request.json().catch(() => null)
      const { message, conversationId, agentSlug, model, maxTokens } = body || {}

      if (!message || typeof message !== 'string') {
        return NextResponse.json(apiEnvelope(null, 'message is required'), { status: 400 })
      }
      if (message.length > 32000) {
        return NextResponse.json(apiEnvelope(null, 'Message too long (max 32K characters)'), { status: 400 })
      }

      const numericMaxTokens = Number(maxTokens)
      const cappedMaxTokens = Number.isFinite(numericMaxTokens)
        ? Math.min(Math.max(64, numericMaxTokens), 16384)
        : undefined

      const stats = await getUsageStats(ctx.organizationId)
      if (stats.totalTokensIn + stats.totalTokensOut > MONTHLY_TOKEN_BUDGET) {
        return NextResponse.json(
          apiEnvelope(null, `Monthly token budget exceeded (${MONTHLY_TOKEN_BUDGET.toLocaleString()} tokens). Contact your organization admin.`),
          { status: 429 },
        )
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
          maxTokens: cappedMaxTokens,
          metadata: agentSlug ? { agentSlug } : undefined,
        },
      )

      return stream.toTextStreamResponse({
        headers: { 'X-Conversation-Id': convId ?? '' },
      }) as unknown as NextResponse
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI chat failed'
      if (msg.includes('No AI providers configured')) {
        return NextResponse.json(
          apiEnvelope(null, 'No AI providers configured. Configure an AI provider in the production environment.'),
          { status: 503 },
        )
      }
      console.error('[POST /api/ai/chat]', error)
      return NextResponse.json(apiEnvelope(null, 'AI chat failed. Please try again.'), { status: 500 })
    }
  },
  { permission: 'ai.chat' },
)
