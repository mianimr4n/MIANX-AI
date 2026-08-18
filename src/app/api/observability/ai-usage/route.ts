// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: AI Usage Dashboard API
// Per-organization cost visibility, quality, and safety signals
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { getAICostSummary } from '@/core/observability'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const summary = getAICostSummary()

  // Per-model cost from in-memory metrics
  const modelBreakdown: Record<string, { requests: number; tokens_in: number; tokens_out: number }> = {}
  const allMetrics = (await import('@/core/observability')).metrics.getAll()
  for (const m of allMetrics) {
    if (m.type === 'counter' && m.name === 'ai_requests_total') {
      const model = m.labels.model || 'unknown'
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { requests: 0, tokens_in: 0, tokens_out: 0 }
      }
      modelBreakdown[model].requests += m.value
    }
    if (m.type === 'counter' && m.name === 'ai_tokens_total') {
      const model = m.labels.model || 'unknown'
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { requests: 0, tokens_in: 0, tokens_out: 0 }
      }
      if (m.labels.direction === 'input') modelBreakdown[model].tokens_in += m.value
      if (m.labels.direction === 'output') modelBreakdown[model].tokens_out += m.value
    }
  }

  // Organization-level AI usage from database
  let orgUsage: Array<{
    organization_id: string
    total_messages: number
    total_tokens_in: number
    total_tokens_out: number
  }> = []
  try {
    const conversations = await db.conversation.groupBy({
      by: ['organizationId'],
      _count: { id: true },
    })

    for (const conv of conversations) {
      const msgs = await db.aiMessage.aggregate({
        where: { conversation: { organizationId: conv.organizationId } },
        _sum: { tokensIn: true, tokensOut: true },
        _count: true,
      })
      orgUsage.push({
        organization_id: conv.organizationId,
        total_messages: msgs._count,
        total_tokens_in: msgs._sum.tokensIn || 0,
        total_tokens_out: msgs._sum.tokensOut || 0,
      })
    }
  } catch {
    // DB query may fail in dev; return empty
  }

  return NextResponse.json({
    summary: {
      total_requests: summary.total_requests,
      total_errors: summary.total_errors,
      total_tokens_in: summary.total_tokens_in,
      total_tokens_out: summary.total_tokens_out,
      total_cost_usd: summary.total_cost_milli_usd / 1000,
      policy_denials: summary.policy_denials,
      loop_detections: summary.loop_detections,
    },
    model_breakdown: modelBreakdown,
    organization_usage: orgUsage,
    collected_at: new Date().toISOString(),
  })
}
