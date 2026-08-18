/**
 * MIANX.AI — AI Tools API
 * GET /api/ai/tools — List available tools with permission requirements
 */

import { NextResponse } from 'next/server'
import { listTools, filterToolsByPermission } from '@/ai'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/ai/tools — List all tools, marking which ones the user can access */
export const GET = withAuth(async (_request, ctx) => {
  const allTools = listTools()
  const accessibleTools = filterToolsByPermission(allTools, ctx.permissions)
  const accessibleNames = new Set(accessibleTools.map(t => t.name))

  return NextResponse.json(apiEnvelope({
    tools: allTools.map(t => ({
      name: t.name,
      description: t.description,
      requiredPermission: t.requiredPermission ?? null,
      accessible: accessibleNames.has(t.name),
    })),
    summary: {
      total: allTools.length,
      accessible: accessibleTools.length,
      restricted: allTools.length - accessibleTools.length,
    },
  }))
}, { permission: 'ai.chat' })
