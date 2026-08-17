// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Permissions API
// GET /api/permissions  — List all available permissions (global)
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/permissions — List all permissions, grouped by domain
export const GET = withAuth(async (_request: NextRequest, ctx: AuthContext) => {
  const permissions = await db.permission.findMany({
    orderBy: { key: 'asc' },
  })

  // Group by domain (first part of key: 'domain.resource.action')
  const grouped: Record<string, typeof permissions> = {}
  for (const p of permissions) {
    const domain = p.key.split('.')[0] || '_other'
    if (!grouped[domain]) grouped[domain] = []
    grouped[domain].push(p)
  }

  return NextResponse.json(apiEnvelope({
    all: permissions,
    grouped,
    userPermissions: ctx.permissions,
  }))
}, { anyPermission: ['member.view', 'organization.view'] })
