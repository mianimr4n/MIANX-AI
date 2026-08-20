// ══════════════════════════════════════════════════════
// MIANX.AI — Audit Logs API
// GET /api/audit-logs — List audit logs (org-scoped, paginated)
// Phase 13: Added auth, pagination, safe error response
// ══════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { parsePagination, prismaPagination, paginateResult } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const { searchParams } = request.nextUrl
  const pagination = parsePagination(searchParams)
  const { skip, take } = prismaPagination(pagination)

  const where = { organizationId: ctx.organizationId }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    db.auditLog.count({ where }),
  ])

  return NextResponse.json(paginateResult(logs, total, pagination))
}, { permission: 'audit.view' })
