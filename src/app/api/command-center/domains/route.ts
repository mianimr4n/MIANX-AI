// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Command Center: Domain View
// Per-domain health: active organizations, requests, errors,
// workflows, integrations, AI, domain-specific KPIs
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const domainSlug = searchParams.get('slug')

  try {
    if (domainSlug) {
      // Single domain detailed view
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
      select: {
        id: true, name: true, slug: true, version: true, status: true,
        _count: {
          organizationDomains: true,
          modules: true,
        },
      },
      orderBy: { name: 'asc' },
    })

    // Enrich with active org count
    const enriched = await Promise.all(domains.map(async (d) => {
      const activeOrgs = await db.organizationDomain.count({
        where: { domainId: d.id, status: 'active' },
      })
      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        version: d.version,
        status: d.status,
        total_organizations: d._count.organizationDomains,
        active_organizations: activeOrgs,
        modules: d._count.modules,
      }
    }))

    return NextResponse.json({ domains: enriched })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load domain data' }, { status: 500 })
  }
}
