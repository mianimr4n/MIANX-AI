// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Integrations API
// GET    /api/integrations          — List OAuth connections
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { listOAuthConnections } from '@/core/integration'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/integrations — List OAuth connections (tokens never returned)
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const connections = await listOAuthConnections(ctx.organizationId)
  return NextResponse.json(apiEnvelope(connections))
}, { anyPermission: ['integration.oauth.view', 'integration.oauth.manage'] })
