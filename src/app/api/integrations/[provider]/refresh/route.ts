// ══════════════════════════════════════════════════════════════════
// MIANX.AI — OAuth Token Refresh API
// POST   /api/integrations/:provider/refresh — Refresh an OAuth token
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { refreshOAuthToken } from '@/core/integration'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

const VALID_PROVIDERS = ['google', 'github', 'stripe', 'custom'] as const

export const dynamic = 'force-dynamic'

// POST /api/integrations/:provider/refresh
export const POST = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { provider }) => {
  if (!VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number])) {
    return NextResponse.json(
      { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
      { status: 400 },
    )
  }

  const connection = await db.oAuthConnection.findUnique({
    where: { organizationId_provider: { organizationId: ctx.organizationId, provider } },
  })

  if (!connection) {
    return NextResponse.json({ error: `No ${provider} connection found` }, { status: 404 })
  }

  try {
    const result = await refreshOAuthToken(connection.id, ctx.organizationId)
    return NextResponse.json(apiEnvelope(result))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}, { permission: 'integration.oauth.manage' })
