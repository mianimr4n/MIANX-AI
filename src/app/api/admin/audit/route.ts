// MIANX.AI - Admin API: Platform Audit Logs
// Requires platform admin authorization.

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, ctx) => {
  requirePlatformAdmin(ctx.user.email)

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const action = searchParams.get('action') || ''

  const where = action ? { action: { contains: action } } : {}

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: {
        id: true, action: true, resourceType: true, resourceId: true,
        metadata: true, createdAt: true,
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ])

  return NextResponse.json({
    data: logs,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})
