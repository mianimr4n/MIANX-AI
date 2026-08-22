// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Command Center: Tenant View
// Phase 19: Requires authentication. Organization scoping uses the
//   authenticated user's membership, not client-supplied org IDs.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = request.nextUrl
  const requestedOrgId = searchParams.get('organization_id')

  // Only allow viewing organizations the user is a member of
  if (requestedOrgId) {
    const membership = await db.organizationMembership.findFirst({
      where: {
        organizationId: requestedOrgId,
        userId: ctx.user.id,
        status: 'active',
      },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    try {
      const org = await db.organization.findUnique({
        where: { id: requestedOrgId },
        select: { id: true, name: true, slug: true, status: true, timezone: true, locale: true },
      })
      if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

      const [memberships, domainHealth, workflowStats, aiStats, securityEvents] = await Promise.all([
        db.organizationMembership.count({ where: { organizationId: requestedOrgId, status: 'active' } }),
        db.organizationDomain.findMany({
          where: { organizationId: requestedOrgId },
          select: { domain: { select: { name: true, slug: true } }, status: true, activatedAt: true },
        }),
        db.workflowRun.groupBy({
          by: ['status'],
          where: { organizationId: requestedOrgId },
          _count: true,
        }),
        db.conversation.aggregate({
          where: { organizationId: requestedOrgId },
          _count: true,
        }),
        db.auditLog.count({
          where: { organizationId: requestedOrgId, action: { contains: 'authorization' } },
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

  // List user's organizations (not ALL organizations)
  try {
    const userOrgs = await db.organizationMembership.findMany({
      where: { userId: ctx.user.id, status: 'active' },
      include: { organization: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    })

    const enriched = await Promise.all(userOrgs.map(async (mo) => {
      const org = mo.organization
      const [memberCount, domainCount, workflowCount, convCount] = await Promise.all([
        db.organizationMembership.count({ where: { organizationId: org.id } }),
        db.organizationDomain.count({ where: { organizationId: org.id } }),
        db.workflow.count({ where: { organizationId: org.id } }),
        db.conversation.count({ where: { organizationId: org.id } }),
      ])

      let subscription: { state: string; plan: string | null; currentPeriodEnd: Date | null } | null = null
      try {
        const sub = await db.subscription.findFirst({
          where: { organizationId: org.id },
          include: { plan: { select: { name: true } } },
        })
        if (sub) {
          subscription = { state: sub.state, plan: sub.plan?.name ?? null, currentPeriodEnd: sub.currentPeriodEnd }
        }
      } catch {}

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        created_at: org.createdAt,
        members: memberCount,
        domains: domainCount,
        workflows: workflowCount,
        conversations: convCount,
        subscription,
      }
    }))

    return NextResponse.json({ organizations: enriched, total: userOrgs.length })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to list organizations' }, { status: 500 })
  }
})
