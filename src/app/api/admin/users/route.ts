// MIANX.AI - Admin API: Platform-wide Users
// Requires platform admin authorization.

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
    ? { userId: { contains: search } }
    : {}

  const [profiles, total] = await Promise.all([
    db.profile.findMany({
      where,
      select: {
        id: true, userId: true, displayName: true, createdAt: true,
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.profile.count({ where }),
  ])

  return NextResponse.json({
    data: profiles,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})
