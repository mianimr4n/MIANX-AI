// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Dashboard API
// Aggregate stats for the Poultry OS dashboard
// ══════════════════════════════════════════════════════

import { withAuth } from '@/core/authorization/middleware'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const GET = withAuth(async (_request, ctx) => {
  const orgId = ctx.organizationId

  const [
    farmCounts,
    activeFlocks,
    todayMortality,
    recentSales,
    feedCostThisMonth,
    upcomingVaccinations,
  ] = await Promise.all([
    Promise.all([
      db.poultryFarm.count({ where: { organizationId: orgId } }),
      db.poultryShed.count({ where: { organizationId: orgId } }),
      db.poultryFlock.count({ where: { organizationId: orgId, status: { in: ['placed', 'growing', 'laying'] } } }),
      db.poultryFlock.aggregate({ where: { organizationId: orgId, status: { in: ['placed', 'growing', 'laying'] } }, _sum: { currentCount: true } }),
    ]),
    db.poultryFlock.findMany({
      where: { organizationId: orgId, status: { in: ['placed', 'growing', 'laying'] } },
      include: { shed: { select: { name: true, farm: { select: { name: true } } } } },
      orderBy: { placementDate: 'desc' }, take: 5,
    }),
    db.poultryMortalityRecord.aggregate({
      where: { organizationId: orgId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { count: true },
    }),
    db.poultrySale.aggregate({
      where: { organizationId: orgId, status: 'completed', date: { gte: new Date(Date.now() - 7 * 86400000) } },
      _sum: { totalAmount: true }, _count: true,
    }),
    db.poultryFeedRecord.aggregate({
      where: { organizationId: orgId, date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      _sum: { costUsd: true, quantityKg: true },
    }),
    db.poultryHealthRecord.findMany({
      where: { organizationId: orgId, type: 'vaccination', nextDueDate: { gte: new Date() } },
      include: { flock: { select: { id: true, breed: true } } },
      orderBy: { nextDueDate: 'asc' }, take: 5,
    }),
  ])

  return apiEnvelope({
    farms: { total: farmCounts[0], sheds: farmCounts[1], activeFlocks: farmCounts[2], totalBirds: farmCounts[3]._sum.currentCount ?? 0 },
    recentFlocks: activeFlocks,
    todayMortality: todayMortality._sum.count ?? 0,
    weeklySales: { count: recentSales._count, revenue: recentSales._sum.totalAmount ?? 0 },
    monthlyFeed: { costUsd: feedCostThisMonth._sum.costUsd ?? 0, quantityKg: feedCostThisMonth._sum.quantityKg ?? 0 },
    upcomingVaccinations,
  })
}, { permission: 'poultry.dashboard.view' })
