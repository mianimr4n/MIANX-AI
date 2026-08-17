// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organizations API
// GET  /api/organizations  — List user's organizations
// POST /api/organizations  — Create organization
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withTenant, getTenantContext } from '@/core/tenancy'
import { slugify } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

// GET /api/organizations — List all organizations (dev mode: no auth)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')

    const organizations = await db.organization.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { memberships: true, teams: true, auditLogs: true },
        },
      },
    })

    const hasMore = organizations.length > limit
    const items = hasMore ? organizations.slice(0, limit) : organizations
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({
      data: items,
      meta: {
        page,
        limit,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/organizations — Create organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, timezone, locale, currency } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Organization name is required (min 2 characters)' },
        { status: 400 }
      )
    }

    const slug = slugify(name)

    // Check slug uniqueness
    const existing = await db.organization.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'Organization with this name already exists' },
        { status: 409 }
      )
    }

    const organization = await db.organization.create({
      data: {
        name: name.trim(),
        slug,
        timezone: timezone || 'UTC',
        locale: locale || 'en',
        currency: currency || 'USD',
      },
    })

    return NextResponse.json({ data: organization }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create organization', details: String(error) },
      { status: 500 }
    )
  }
}
