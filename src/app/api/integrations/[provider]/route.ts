// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Integration Provider API
// DELETE /api/integrations/:provider — Revoke an OAuth connection
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { revokeOAuthConnection } from '@/core/integration'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

const VALID_PROVIDERS = ['google', 'github', 'stripe', 'custom'] as const

export const dynamic = 'force-dynamic'

// DELETE /api/integrations/:provider — Revoke OAuth connection
export const DELETE = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { provider }) => {
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
    const revoked = await revokeOAuthConnection(connection.id, ctx.organizationId)
    return NextResponse.json(apiEnvelope({
      id: revoked.id,
      provider: revoked.provider,
      status: revoked.status,
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 409 })
  }
}, { permission: 'integration.oauth.manage' })
