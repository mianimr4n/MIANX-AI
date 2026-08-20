/**
 * MIANX.AI — Single Agent Config API
 * GET    /api/ai/agents/:slug — Get a custom agent
 * PATCH  /api/ai/agents/:slug — Update a custom agent
 * DELETE /api/ai/agents/:slug — Archive a custom agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAgentConfig, updateAgentConfig, deleteAgentConfig, type UpdateAgentConfigData } from '@/ai'
import { withAuthParams } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/ai/agents/:slug */
export const GET = withAuthParams(async (
  _request,
  ctx,
  { slug }
) => {
  const agent = await getAgentConfig(ctx.organizationId, slug)
  if (!agent) {
    return NextResponse.json(apiEnvelope(null, `Agent '${slug}' not found`), { status: 404 })
  }
  return NextResponse.json(apiEnvelope({ ...agent, isCustom: true }))
}, { permission: 'ai.agents.manage' })

/** PATCH /api/ai/agents/:slug — Update a custom agent */
export const PATCH = withAuthParams(async (
  request,
  ctx,
  { slug }
) => {
  try {
    const body = await request.json()
    const updated = await updateAgentConfig(ctx.organizationId, slug, body as UpdateAgentConfigData)
    return NextResponse.json(apiEnvelope(updated, 'Agent updated'))
  } catch (error) {
    console.error('[PATCH /api/ai/agents/:slug]', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(apiEnvelope(null, 'Agent not found'), { status: 404 })
    }
    return NextResponse.json(apiEnvelope(null, 'Failed to update agent'), { status: 400 })
  }
}, { permission: 'ai.agents.manage' })

/** DELETE /api/ai/agents/:slug — Archive a custom agent */
export const DELETE = withAuthParams(async (
  _request,
  ctx,
  { slug }
) => {
  try {
    const deleted = await deleteAgentConfig(ctx.organizationId, slug)
    return NextResponse.json(apiEnvelope(deleted, 'Agent archived'))
  } catch (error) {
    console.error('[DELETE /api/ai/agents/:slug]', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(apiEnvelope(null, 'Agent not found'), { status: 404 })
    }
    return NextResponse.json(apiEnvelope(null, 'Failed to delete agent'), { status: 400 })
  }
}, { permission: 'ai.agents.manage' })
