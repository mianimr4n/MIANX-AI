// MIANX.AI - Admin API: Revenue Overview
// Requires platform admin authorization.

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (_request, ctx) => {
  requirePlatformAdmin(ctx.user.email)

  const [totalSubscriptions, activeSubscriptions, totalInvoices, paidInvoices, plans] = await Promise.all([
    db.subscription.count(),
    db.subscription.count({ where: { state: 'active' } }),
    db.invoice.count(),
    db.invoice.count({ where: { status: 'paid' } }),
    db.plan.findMany({
      select: { id: true, name: true, basePrice: true, billingCycle: true, _count: { select: { subscriptions: true } } },
    }),
  ])

  return NextResponse.json({
    subscriptions: { total: totalSubscriptions, active: activeSubscriptions },
    invoices: { total: totalInvoices, paid: paidInvoices },
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.basePrice,
      interval: p.billingCycle,
      subscribers: p._count.subscriptions,
    })),
  })
})
