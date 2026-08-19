// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Farm Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export async function listFarms(organizationId: string, opts?: { status?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.status) where.status = opts.status

  const farms = await db.poultryFarm.findMany({
    where,
    include: {
      _count: { select: { sheds: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return apiEnvelope(farms)
}

export async function getFarm(organizationId: string, id: string) {
  const farm = await db.poultryFarm.findFirst({
    where: { id, organizationId },
    include: {
      sheds: { orderBy: { name: 'asc' }, include: { _count: { select: { flocks: true } } } },
    },
  })
  if (!farm) return apiEnvelope(null, 'Farm not found')
  return apiEnvelope(farm)
}

export async function createFarm(organizationId: string, data: {
  name: string; location: string; capacity?: number; contactInfo?: string; latitude?: number; longitude?: number
}) {
  const farm = await db.poultryFarm.create({
    data: { organizationId, name: data.name, location: data.location, capacity: data.capacity ?? 0, contactInfo: data.contactInfo, latitude: data.latitude, longitude: data.longitude },
  })
  return apiEnvelope(farm, undefined, 201)
}

export async function updateFarm(organizationId: string, id: string, data: {
  name?: string; location?: string; capacity?: number; status?: string; contactInfo?: string; latitude?: number; longitude?: number
}) {
  const existing = await db.poultryFarm.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Farm not found')

  const farm = await db.poultryFarm.update({
    where: { id },
    data: { ...data, status: data.status as never || undefined },
  })
  return apiEnvelope(farm)
}

export async function deleteFarm(organizationId: string, id: string) {
  const existing = await db.poultryFarm.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Farm not found')

  await db.poultryFarm.delete({ where: { id } })
  return apiEnvelope({ deleted: true })
}

export async function getFarmStats(organizationId: string) {
  const [totalFarms, activeFarms, totalSheds, totalCapacity, totalBirds] = await Promise.all([
    db.poultryFarm.count({ where: { organizationId } }),
    db.poultryFarm.count({ where: { organizationId, status: 'active' } }),
    db.poultryShed.count({ where: { organizationId } }),
    db.poultryFarm.aggregate({ where: { organizationId }, _sum: { capacity: true } }),
    db.poultryFlock.aggregate({ where: { organizationId, status: { in: ['placed', 'growing', 'laying'] } }, _sum: { currentCount: true } }),
  ])
  return apiEnvelope({
    totalFarms,
    activeFarms,
    totalSheds,
    totalCapacity: totalCapacity._sum.capacity ?? 0,
    totalBirds: totalBirds._sum.currentCount ?? 0,
  })
}
