// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Production Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export async function listProductionRecords(organizationId: string, opts?: { flockId?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.flockId) where.flockId = opts.flockId
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const records = await db.poultryProductionRecord.findMany({
    where,
    include: { flock: { select: { id: true, breed: true, status: true } } },
    orderBy: { date: 'desc' },
    take: 100,
  })
  return apiEnvelope(records)
}

export async function createProductionRecord(organizationId: string, data: {
  flockId: string; date: string; eggsCollected?: number; totalWeightKg?: number; feedConversionRatio?: number; notes?: string
}) {
  const flock = await db.poultryFlock.findFirst({ where: { id: data.flockId, organizationId } })
  if (!flock) return apiEnvelope(null, 'Flock not found')

  const record = await db.poultryProductionRecord.create({
    data: {
      organizationId, flockId: data.flockId, date: new Date(data.date),
      eggsCollected: data.eggsCollected ?? 0, totalWeightKg: data.totalWeightKg ?? 0,
      feedConversionRatio: data.feedConversionRatio,
      notes: data.notes,
    },
  })
  return apiEnvelope(record, undefined, 201)
}

export async function deleteProductionRecord(organizationId: string, id: string) {
  const existing = await db.poultryProductionRecord.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Production record not found')
  await db.poultryProductionRecord.delete({ where: { id } })
  return apiEnvelope({ deleted: true })
}

export async function getProductionSummary(organizationId: string, opts?: { flockId?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.flockId) where.flockId = opts.flockId
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const [totals, recordCount, byFlock] = await Promise.all([
    db.poultryProductionRecord.aggregate({ where, _sum: { eggsCollected: true, totalWeightKg: true }, _avg: { feedConversionRatio: true } }),
    db.poultryProductionRecord.count({ where }),
    db.poultryProductionRecord.groupBy({ where, by: ['flockId'], _sum: { eggsCollected: true, totalWeightKg: true }, _count: true }),
  ])

  // Enrich with flock breed info
  const flockIds = byFlock.map(f => f.flockId)
  const flocks = flockIds.length > 0
    ? await db.poultryFlock.findMany({ where: { id: { in: flockIds }, organizationId }, select: { id: true, breed: true } })
    : []
  const flockMap = new Map(flocks.map(f => [f.id, f]))

  return apiEnvelope({
    recordCount,
    totalEggs: totals._sum.eggsCollected ?? 0,
    totalWeightKg: totals._sum.totalWeightKg ?? 0,
    avgFCR: totals._avg.feedConversionRatio ? Math.round(totals._avg.feedConversionRatio * 1000) / 1000 : null,
    byFlock: byFlock.map(f => ({
      flockId: f.flockId,
      breed: flockMap.get(f.flockId)?.breed ?? 'unknown',
      recordCount: f._count,
      totalEggs: f._sum.eggsCollected ?? 0,
      totalWeightKg: f._sum.totalWeightKg ?? 0,
    })),
  })
}