// ══════════════════════════════════════════════════════════════════
// MIANX.AI — API Key Detail API
// PATCH  /api/api-keys/:id  — Revoke an API key
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { revokeApiKey } from '@/core/integration'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// PATCH /api/api-keys/:id — Revoke an API key
export const PATCH = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const existing = await db.apiKey.findUnique({ where: { id, organizationId: ctx.organizationId } })
  if (!existing) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  try {
    const revoked = await revokeApiKey(id, ctx.organizationId)
    return NextResponse.json(apiEnvelope({
      id: revoked.id,
      name: revoked.name,
      prefix: revoked.prefix,
      status: revoked.status,
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 409 })
  }
}, { permission: 'integration.apikeys.manage' })
