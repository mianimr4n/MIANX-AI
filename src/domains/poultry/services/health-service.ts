// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Health Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export async function listHealthRecords(organizationId: string, opts?: { flockId?: string; type?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.flockId) where.flockId = opts.flockId
  if (opts?.type) where.type = opts.type
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const records = await db.poultryHealthRecord.findMany({
    where,
    include: { flock: { select: { id: true, breed: true, status: true } } },
    orderBy: { date: 'desc' },
    take: 100,
  })
  return apiEnvelope(records)
}

export async function createHealthRecord(organizationId: string, data: {
  flockId: string; date: string; type: string; treatment: string; veterinarian?: string; costUsd?: number; nextDueDate?: string; notes?: string
}) {
  const flock = await db.poultryFlock.findFirst({ where: { id: data.flockId, organizationId } })
  if (!flock) return apiEnvelope(null, 'Flock not found')

  const record = await db.poultryHealthRecord.create({
    data: {
      organizationId, flockId: data.flockId, date: new Date(data.date),
      type: data.type as never, treatment: data.treatment,
      veterinarian: data.veterinarian, costUsd: data.costUsd ?? 0,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      notes: data.notes,
    },
  })
  return apiEnvelope(record, undefined, 201)
}

export async function deleteHealthRecord(organizationId: string, id: string) {
  const existing = await db.poultryHealthRecord.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Health record not found')
  await db.poultryHealthRecord.delete({ where: { id } })
  return apiEnvelope({ deleted: true })
}

export async function getMortalityRecords(organizationId: string, opts?: { flockId?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.flockId) where.flockId = opts.flockId
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const records = await db.poultryMortalityRecord.findMany({
    where,
    include: { flock: { select: { id: true, breed: true, status: true } } },
    orderBy: { date: 'desc' },
    take: 100,
  })
  return apiEnvelope(records)
}

export async function getHealthSummary(organizationId: string, opts?: { flockId?: string }) {
  const flockWhere: Record<string, unknown> = { organizationId, status: { in: ['placed', 'growing', 'laying'] } }
  if (opts?.flockId) flockWhere.id = opts.flockId

  const [activeFlocks, totalMortality, byCause, upcomingVaccinations] = await Promise.all([
    db.poultryFlock.findMany({ where: flockWhere, select: { id: true, breed: true, quantity: true, currentCount: true, status: true } }),
    db.poultryMortalityRecord.aggregate({ where: { organizationId, flock: flockWhere }, _sum: { count: true } }),
    db.poultryMortalityRecord.groupBy({ where: { organizationId, flock: flockWhere }, by: ['cause'], _sum: { count: true }, orderBy: { _sum: { count: 'desc' } }, take: 5 }),
    db.poultryHealthRecord.findMany({ where: { organizationId, type: 'vaccination', nextDueDate: { gte: new Date() } }, include: { flock: { select: { id: true, breed: true } } }, orderBy: { nextDueDate: 'asc' }, take: 10 }),
  ])

  const totalPlaced = activeFlocks.reduce((sum, f) => sum + f.quantity, 0)
  const totalCurrent = activeFlocks.reduce((sum, f) => sum + f.currentCount, 0)
  const overallMortalityRate = totalPlaced > 0 ? ((totalMortality._sum.count ?? 0) / totalPlaced * 100) : 0

  return apiEnvelope({
    activeFlocks: activeFlocks.length,
    totalPlaced,
    totalCurrent,
    totalMortality: totalMortality._sum.count ?? 0,
    overallMortalityRate: Math.round(overallMortalityRate * 100) / 100,
    topMortalityCauses: byCause,
    upcomingVaccinations,
  })
}