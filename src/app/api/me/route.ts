// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Me API
// GET /api/me/organizations  — List user's organizations
// GET /api/me/context       — Get auth context for specific org
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentUser, resolveDevAuthContext, getUserOrganizations, resolveAuthContext } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/me — Current user info + organizations
export async function GET(request: NextRequest) {
  try {
    // Dev mode
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      const devCtx = await resolveDevAuthContext(request)
      if (!devCtx) {
        return NextResponse.json({
          data: {
            user: { id: 'user-admin-001', email: 'dev@mianx.ai' },
            mode: 'dev',
            organizations: [],
          },
        })
      }

      const orgs = await getUserOrganizations(devCtx.userId)
      const currentCtx = await resolveAuthContext(devCtx.userId, devCtx.organizationId)

      return NextResponse.json(apiEnvelope({
        user: { id: devCtx.userId, email: 'dev@mianx.ai' },
        mode: 'dev',
        organizations: orgs,
        currentContext: {
          organizationId: currentCtx.organizationId,
          roles: currentCtx.roles.map(r => ({ name: r.name, slug: r.slug })),
          permissionCount: currentCtx.permissions.length,
        },
      }))
    }

    // Supabase mode
    const user = await resolveCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const orgs = await getUserOrganizations(user.id)

    return NextResponse.json(apiEnvelope({
      user: { id: user.id, email: user.email },
      mode: 'authenticated',
      organizations: orgs,
    }))
  } catch (error) {
    console.error('[Me API error]', error)
    return NextResponse.json({ error: 'Failed to load user context' }, { status: 500 })
  }
}
