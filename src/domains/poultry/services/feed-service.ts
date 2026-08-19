// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Feed Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export async function listFeedRecords(organizationId: string, opts?: { flockId?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.flockId) where.flockId = opts.flockId
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const records = await db.poultryFeedRecord.findMany({
    where,
    include: { flock: { select: { id: true, breed: true, status: true } } },
    orderBy: { date: 'desc' },
    take: 100,
  })
  return apiEnvelope(records)
}

export async function createFeedRecord(organizationId: string, data: {
  flockId: string; date: string; feedType: string; quantityKg: number; costUsd?: number; notes?: string
}) {
  const flock = await db.poultryFlock.findFirst({ where: { id: data.flockId, organizationId } })
  if (!flock) return apiEnvelope(null, 'Flock not found')

  const record = await db.poultryFeedRecord.create({
    data: { organizationId, flockId: data.flockId, date: new Date(data.date), feedType: data.feedType, quantityKg: data.quantityKg, costUsd: data.costUsd ?? 0, notes: data.notes },
  })
  return apiEnvelope(record, undefined, 201)
}

export async function deleteFeedRecord(organizationId: string, id: string) {
  const existing = await db.poultryFeedRecord.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Feed record not found')
  await db.poultryFeedRecord.delete({ where: { id } })
  return apiEnvelope({ deleted: true })
}

export async function getFeedSummary(organizationId: string, opts?: { flockId?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.flockId) where.flockId = opts.flockId
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const [totalKg, totalCost, byType] = await Promise.all([
    db.poultryFeedRecord.aggregate({ where, _sum: { quantityKg: true, costUsd: true } }),
    db.poultryFeedRecord.count({ where }),
    db.poultryFeedRecord.groupBy({ where, by: ['feedType'], _sum: { quantityKg: true, costUsd: true } }),
  ])

  return apiEnvelope({
    totalRecords: totalCost,
    totalQuantityKg: totalKg._sum.quantityKg ?? 0,
    totalCostUsd: totalKg._sum.costUsd ?? 0,
    avgCostPerKg: (totalKg._sum.quantityKg ?? 0) > 0 ? (totalKg._sum.costUsd ?? 0) / (totalKg._sum.quantityKg ?? 1) : 0,
    byFeedType: byType.map(t => ({ feedType: t.feedType, quantityKg: t._sum.quantityKg ?? 0, costUsd: t._sum.costUsd ?? 0 })),
  })
}