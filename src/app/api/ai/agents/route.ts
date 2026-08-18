/**
 * MIANX.AI — AI Agents API
 * GET /api/ai/agents — List available system agents + org custom agents
 */

import { NextResponse } from 'next/server'
import { listSystemAgents } from '@/ai'
import { db } from '@/lib/db'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/ai/agents — List agents */
export const GET = withAuth(async (_request, ctx) => {
  const systemAgents = listSystemAgents()

  // Get org-specific agent configs
  const customAgents = await db.agentConfig.findMany({
    where: { organizationId: ctx.organizationId, status: 'active' },
    select: { slug: true, name: true, description: true, model: true, provider: true, tools: true },
  })

  return NextResponse.json(apiEnvelope({
    system: systemAgents.map(a => ({ slug: a.slug, name: a.name, description: a.description, model: a.model, provider: a.provider, toolCount: a.tools?.length ?? 0, icon: a.icon })),
    custom: customAgents.map(a => ({ ...a, isCustom: true })),
  }))
}, { permission: 'domain.view' })
