// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Shed Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export async function listSheds(organizationId: string, opts?: { farmId?: string; status?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.farmId) where.farmId = opts.farmId
  if (opts?.status) where.status = opts.status

  const sheds = await db.poultryShed.findMany({
    where,
    include: {
      farm: { select: { id: true, name: true } },
      _count: { select: { flocks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return apiEnvelope(sheds)
}

export async function getShed(organizationId: string, id: string) {
  const shed = await db.poultryShed.findFirst({
    where: { id, organizationId },
    include: {
      farm: { select: { id: true, name: true, location: true } },
      flocks: { where: { status: { in: ['placed', 'growing', 'laying'] } }, orderBy: { placementDate: 'desc' } },
    },
  })
  if (!shed) return apiEnvelope(null, 'Shed not found')
  return apiEnvelope(shed)
}

export async function createShed(organizationId: string, data: {
  farmId: string; name: string; shedType?: string; capacity?: number
}) {
  // Verify farm belongs to org
  const farm = await db.poultryFarm.findFirst({ where: { id: data.farmId, organizationId } })
  if (!farm) return apiEnvelope(null, 'Farm not found')

  const shed = await db.poultryShed.create({
    data: {
      organizationId, farmId: data.farmId, name: data.name,
      shedType: (data.shedType as never) || 'broiler',
      capacity: data.capacity ?? 0,
    },
  })
  return apiEnvelope(shed, undefined, 201)
}

export async function updateShed(organizationId: string, id: string, data: {
  name?: string; shedType?: string; capacity?: number; currentCount?: number; temperature?: number; humidity?: number; status?: string
}) {
  const existing = await db.poultryShed.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Shed not found')

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.shedType !== undefined) updateData.shedType = data.shedType
  if (data.capacity !== undefined) updateData.capacity = data.capacity
  if (data.currentCount !== undefined) updateData.currentCount = data.currentCount
  if (data.temperature !== undefined) updateData.temperature = data.temperature
  if (data.humidity !== undefined) updateData.humidity = data.humidity
  if (data.status !== undefined) updateData.status = data.status

  const shed = await db.poultryShed.update({ where: { id }, data: updateData })
  return apiEnvelope(shed)
}

export async function deleteShed(organizationId: string, id: string) {
  const existing = await db.poultryShed.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Shed not found')
  await db.poultryShed.delete({ where: { id } })
  return apiEnvelope({ deleted: true })
}
