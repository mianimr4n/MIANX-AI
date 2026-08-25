/**
 * MIANX.AI — AI Models API
 * GET /api/ai/models — List available models and configured providers
 * Phase 22: Requires auth + valid membership. No anonymous provider leak.
 */

import { NextResponse } from 'next/server'
import { listModels, getConfiguredProviders } from '@/ai'
import { apiEnvelope } from '@/core/tenancy/utils'
import { withAuth } from '@/core/authorization'

export const GET = withAuth(async () => {
  const models = listModels()
  const providers = getConfiguredProviders()

  return NextResponse.json(apiEnvelope({
    models: models.map(m => ({
      id: m.id,
      provider: m.provider,
      displayName: m.displayName,
      tier: m.tier,
      capabilities: m.capabilities,
      costPer1kIn: m.costPer1kIn,
      costPer1kOut: m.costPer1kOut,
    })),
    configuredProviders: providers.map(p => ({
      provider: p.provider,
      modelCount: p.models.length,
    })),
  }))
}, { permission: 'ai.chat' })
