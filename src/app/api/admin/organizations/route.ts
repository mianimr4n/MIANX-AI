// ══════════════════════════════════════════════════════
// MIANX.AI — Admin API: Platform-wide Organizations
// Requires platform admin authorization.
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, ctx) => {
  requirePlatformAdmin(ctx.user.email)

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search, mode: 'insensitive' as const } }] }
    : {}

  const [organizations, total] = await Promise.all([
    db.organization.findMany({
      where,
      select: {
        id: true, name: true, slug: true, status: true, timezone: true, locale: true,
        currency: true, createdAt: true,
        _count: { select: { memberships: true, teams: true, auditLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.organization.count({ where }),
  ])

  return NextResponse.json({
    data: organizations,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})