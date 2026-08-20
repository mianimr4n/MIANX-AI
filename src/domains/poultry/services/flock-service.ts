// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Flock Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export async function listFlocks(organizationId: string, opts?: { shedId?: string; status?: string; breed?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.shedId) where.shedId = opts.shedId
  if (opts?.status) where.status = opts.status
  if (opts?.breed) where.breed = opts.breed

  const flocks = await db.poultryFlock.findMany({
    where,
    include: {
      shed: { select: { id: true, name: true, farm: { select: { id: true, name: true } } } },
      _count: { select: { feedRecords: true, healthRecords: true, mortalityRecords: true, productionRecords: true } },
    },
    orderBy: { placementDate: 'desc' },
  })
  return apiEnvelope(flocks)
}

export async function getFlock(organizationId: string, id: string) {
  const flock = await db.poultryFlock.findFirst({
    where: { id, organizationId },
    include: {
      shed: { select: { id: true, name: true, farm: { select: { id: true, name: true, location: true } } } },
      feedRecords: { orderBy: { date: 'desc' }, take: 10 },
      healthRecords: { orderBy: { date: 'desc' }, take: 10 },
      mortalityRecords: { orderBy: { date: 'desc' }, take: 10 },
      productionRecords: { orderBy: { date: 'desc' }, take: 10 },
    },
  })
  if (!flock) return apiEnvelope(null, 'Flock not found')
  return apiEnvelope(flock)
}

export async function createFlock(organizationId: string, data: {
  shedId: string; breed: string; placementDate: string; quantity: number; notes?: string
}) {
  // Verify shed belongs to org
  const shed = await db.poultryShed.findFirst({ where: { id: data.shedId, organizationId } })
  if (!shed) return apiEnvelope(null, 'Shed not found')

  const flock = await db.poultryFlock.create({
    data: {
      organizationId, shedId: data.shedId, breed: data.breed,
      placementDate: new Date(data.placementDate),
      quantity: data.quantity, currentCount: data.quantity,
      status: 'placed', notes: data.notes,
    },
  })

  // Update shed current count
  await db.poultryShed.update({
    where: { id: data.shedId },
    data: { currentCount: { increment: data.quantity } },
  })

  return apiEnvelope(flock, undefined, 201)
}

export async function updateFlock(organizationId: string, id: string, data: {
 status?: string; averageWeight?: number; currentCount?: number; notes?: string
}) {
  const existing = await db.poultryFlock.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Flock not found')

  const updateData: Record<string, unknown> = {}
  if (data.status !== undefined) updateData.status = data.status
  if (data.averageWeight !== undefined) updateData.averageWeight = data.averageWeight
  if (data.currentCount !== undefined) updateData.currentCount = data.currentCount
  if (data.notes !== undefined) updateData.notes = data.notes

  const flock = await db.poultryFlock.update({ where: { id }, data: updateData })
  return apiEnvelope(flock)
}

export async function recordMortality(organizationId: string, flockId: string, data: {
  date: string; count: number; cause: string; notes?: string
}) {
  const flock = await db.poultryFlock.findFirst({ where: { id: flockId, organizationId } })
  if (!flock) return apiEnvelope(null, 'Flock not found')

  const record = await db.poultryMortalityRecord.create({
    data: { organizationId, flockId, date: new Date(data.date), count: data.count, cause: data.cause, notes: data.notes },
  })

  // Update flock current count
  const newCount = Math.max(0, flock.currentCount - data.count)
  await db.poultryFlock.update({ where: { id: flockId }, data: { currentCount: newCount } })

  // Auto-deplete if count reaches 0
  if (newCount === 0) {
    await db.poultryFlock.update({ where: { id: flockId }, data: { status: 'depleted' } })
  }

  return apiEnvelope(record, undefined, 201)
}

export async function getFlockMetrics(organizationId: string, flockId: string) {
  const flock = await db.poultryFlock.findFirst({ where: { id: flockId, organizationId } })
  if (!flock) return apiEnvelope(null, 'Flock not found')

  const [totalMortality, totalFeedCost, totalEggs, latestWeight] = await Promise.all([
    db.poultryMortalityRecord.aggregate({ where: { flockId, organizationId }, _sum: { count: true } }),
    db.poultryFeedRecord.aggregate({ where: { flockId, organizationId }, _sum: { costUsd: true, quantityKg: true } }),
    db.poultryProductionRecord.aggregate({ where: { flockId, organizationId }, _sum: { eggsCollected: true, totalWeightKg: true } }),
    db.poultryProductionRecord.findFirst({ where: { flockId, organizationId }, orderBy: { date: 'desc' }, select: { totalWeightKg: true } }),
  ])

  const mortalityRate = flock.quantity > 0 ? ((totalMortality._sum.count ?? 0) / flock.quantity * 100) : 0
  const feedKg = totalFeedCost._sum.quantityKg ?? 0
  const eggWeightKg = totalEggs._sum.totalWeightKg ?? 0
  const fcr = feedKg > 0 && eggWeightKg > 0
    ? feedKg / eggWeightKg
    : null
  const ageDays = Math.max(0, Math.floor((Date.now() - flock.placementDate.getTime()) / 86400000))

  return apiEnvelope({
    flockId: flock.id,
    breed: flock.breed,
    status: flock.status,
    ageDays,
    placed: flock.quantity,
    current: flock.currentCount,
    mortality: totalMortality._sum.count ?? 0,
    mortalityRate: Math.round(mortalityRate * 100) / 100,
    totalFeedKg: totalFeedCost._sum.quantityKg ?? 0,
    totalFeedCost: totalFeedCost._sum.costUsd ?? 0,
    totalEggs: totalEggs._sum.eggsCollected ?? 0,
    totalProductionKg: totalEggs._sum.totalWeightKg ?? 0,
    fcr,
    latestWeight: latestWeight?.totalWeightKg ?? flock.averageWeight,
  })
}
