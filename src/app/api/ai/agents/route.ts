/**
 * MIANX.AI — AI Agents API
 * GET    /api/ai/agents — List available system agents + org custom agents
 * POST   /api/ai/agents — Create a custom agent for the organization
 */

import { NextRequest, NextResponse } from 'next/server'
import { listSystemAgents, createAgentConfig, type CreateAgentConfigData } from '@/ai'
import { db } from '@/lib/db'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/ai/agents — List agents (system + custom) */
export const GET = withAuth(async (_request, ctx) => {
  const systemAgents = listSystemAgents()

  // Get org-specific agent configs
  const customAgents = await db.agentConfig.findMany({
    where: { organizationId: ctx.organizationId, status: 'active' },
    select: { slug: true, name: true, description: true, model: true, provider: true, tools: true, temperature: true, maxTokens: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json(apiEnvelope({
    system: systemAgents.map(a => ({ slug: a.slug, name: a.name, description: a.description, model: a.model, provider: a.provider, toolCount: a.tools?.length ?? 0, icon: a.icon })),
    custom: customAgents.map(a => ({ ...a, isCustom: true })),
  }))
}, { permission: 'ai.agents.manage' })

/** POST /api/ai/agents — Create a custom agent */
export const POST = withAuth(async (request, ctx) => {
  try {
    const body = await request.json()
    const { slug, name, description, systemPrompt, model, provider, temperature, maxTokens, tools } = body

    if (!slug || !name || !systemPrompt || !model || !provider) {
      return NextResponse.json(apiEnvelope(null, 'slug, name, systemPrompt, model, and provider are required'), { status: 400 })
    }

    const agent = await createAgentConfig({
      organizationId: ctx.organizationId,
      slug,
      name,
      description,
      systemPrompt,
      model,
      provider,
      temperature,
      maxTokens,
      tools,
    } as CreateAgentConfigData)

    return NextResponse.json(apiEnvelope(agent, 'Agent created'), { status: 201 })
  } catch (error) {
    console.error('[POST /api/ai/agents]', error)
    const msg = process.env.NODE_ENV === 'production'
      ? 'Failed to create agent'
      : (error instanceof Error ? error.message : 'Failed to create agent')
    return NextResponse.json(apiEnvelope(null, msg), { status: 400 })
  }
}, { permission: 'ai.agents.manage' })
