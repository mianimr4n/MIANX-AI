// ══════════════════════════════════════════════════════════════════
// MIANX.AI — API Keys API
// GET    /api/api-keys       — List API keys for organization
// POST   /api/api-keys       — Create a new API key
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { createApiKey, listApiKeys } from '@/core/integration'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/api-keys — List API keys (never returns the key itself)
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const keys = await listApiKeys(ctx.organizationId)
  return NextResponse.json(apiEnvelope(keys))
}, { anyPermission: ['integration.apikeys.view', 'integration.apikeys.manage'] })

// POST /api/api-keys — Create a new API key
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { name, expiresInDays } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'name is required (min 2 characters)' },
      { status: 400 },
    )
  }

  let expiresAt: Date | undefined
  if (expiresInDays !== undefined) {
    const days = Number(expiresInDays)
    if (!Number.isFinite(days) || days < 1 || days > 730) {
      return NextResponse.json(
        { error: 'expiresInDays must be a number between 1 and 730' },
        { status: 400 },
      )
    }
    expiresAt = new Date(Date.now() + days * 86400000)
  }

  const result = await createApiKey({
    organizationId: ctx.organizationId,
    name: name.trim(),
    expiresAt,
  })

  return NextResponse.json(apiEnvelope(result, {
    message: 'Store this key securely. It cannot be retrieved again.',
  }), { status: 201 })
}, { permission: 'integration.apikeys.manage' })
