// ══════════════════════════════════════════════════════════════════
// MIANX.AI — OAuth Providers API
// GET    /api/integrations/providers — List supported OAuth providers
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { listProviders } from '@/core/integration'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/integrations/providers
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const providers = listProviders()
  return NextResponse.json(apiEnvelope(providers))
}, { anyPermission: ['integration.oauth.view', 'integration.oauth.manage'] })
