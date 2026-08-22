// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Command Center: Domain View
// Phase 19: Requires authentication. Domain listing is public data
//   but enriched views require auth to prevent information leakage.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request) => {
  const { searchParams } = request.nextUrl
  const domainSlug = searchParams.get('slug')

  try {
    if (domainSlug) {
      const domain = await db.domain.findUnique({
        where: { slug: domainSlug },
        select: { id: true, name: true, slug: true, version: true, status: true },
      })
      if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 })

      const [activeOrgs, modules] = await Promise.all([
        db.organizationDomain.count({ where: { domainId: domain.id, status: 'active' } }),
        db.module.findMany({
          where: { domainId: domain.id },
          select: { name: true, slug: true, status: true },
        }),
      ])

      return NextResponse.json({
        domain,
        health: {
          active_organizations: activeOrgs,
          modules: modules.map(m => ({ name: m.name, slug: m.slug, status: m.status })),
        },
      })
    }

    // All domains overview
    const domains = await db.domain.findMany({
      orderBy: { name: 'asc' },
      take: 100,
    })

    const enriched = await Promise.all(domains.map(async (d) => {
      const [activeOrgs, moduleCount] = await Promise.all([
        db.organizationDomain.count({ where: { domainId: d.id, status: 'active' } }),
        db.module.count({ where: { domainId: d.id } }),
      ])
      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        version: d.version,
        status: d.status,
        total_organizations: activeOrgs,
        active_organizations: activeOrgs,
        modules: moduleCount,
      }
    }))

    return NextResponse.json({ domains: enriched })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load domain data' }, { status: 500 })
  }
})
