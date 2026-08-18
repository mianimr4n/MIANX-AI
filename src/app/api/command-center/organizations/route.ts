// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Command Center: Tenant View
// Per-organization health: subscription, usage, domain health,
// API health, workflow failures, AI usage, security events
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const orgId = searchParams.get('organization_id')

  if (!orgId) {
    // List all organizations with summary
    try {
      const orgs = await db.organization.findMany({
        select: {
          id: true, name: true, slug: true, status: true,
          createdAt: true,
          _count: {
            memberships: true,
            domains: true,
            workflows: true,
            conversations: true,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      // Enrich with subscription info
      const enriched = await Promise.all(orgs.map(async (org) => {
        let subscription = null
        try {
          subscription = await db.subscription.findFirst({
            where: { organizationId: org.id },
            select: { state: true, currentPeriodEnd: true, plan: { select: { name: true } } },
          })
        } catch {}

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          created_at: org.createdAt,
          members: org._count.memberships,
          domains: org._count.domains,
          workflows: org._count.workflows,
          conversations: org._count.conversations,
          subscription: subscription ? {
            state: subscription.state,
            plan: subscription.plan?.name,
            period_end: subscription.currentPeriodEnd,
          } : null,
        }
      }))

      return NextResponse.json({ organizations: enriched, total: orgs.length })
    } catch (err) {
      return NextResponse.json({ error: 'Failed to list organizations' }, { status: 500 })
    }
  }

  // Single organization detailed view
  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, status: true, timezone: true, locale: true },
    })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const [memberships, domainHealth, workflowStats, aiStats, securityEvents] = await Promise.all([
      db.organizationMembership.count({ where: { organizationId: orgId, status: 'active' } }),
      db.organizationDomain.findMany({
        where: { organizationId: orgId },
        select: { domain: { select: { name: true, slug: true } }, status: true, activatedAt: true },
      }),
      db.workflowRun.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),
      db.conversation.aggregate({
        where: { organizationId: orgId },
        _count: true,
      }),
      db.auditLog.count({
        where: {
          organizationId: orgId,
          action: { contains: 'authorization' },
        },
      }),
    ])

    return NextResponse.json({
      organization: org,
      health: {
        active_members: memberships,
        domains: domainHealth,
        workflow_runs: workflowStats.map(w => ({ status: w.status, count: w._count })),
        ai_conversations: aiStats._count,
        security_events: securityEvents,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load organization details' }, { status: 500 })
  }
}
