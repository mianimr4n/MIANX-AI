// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Procurement Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export async function listProcurements(organizationId: string, opts?: { type?: string; status?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.type) where.type = opts.type
  if (opts?.status) where.status = opts.status
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const records = await db.poultryProcurement.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 100,
  })
  return apiEnvelope(records)
}

export async function createProcurement(organizationId: string, data: {
  type: string; supplier: string; description: string; quantity: number; unit?: string; unitCostUsd?: number; totalCostUsd?: number; date?: string; deliveryDate?: string; notes?: string
}) {
  const totalCost = data.totalCostUsd ?? (data.quantity * (data.unitCostUsd ?? 0))
  const record = await db.poultryProcurement.create({
    data: {
      organizationId, type: data.type as never, supplier: data.supplier,
      description: data.description, quantity: data.quantity,
      unit: data.unit ?? 'kg', unitCostUsd: data.unitCostUsd ?? 0, totalCostUsd: totalCost,
      date: data.date ? new Date(data.date) : new Date(),
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      notes: data.notes,
    },
  })
  return apiEnvelope(record, undefined, 201)
}

export async function updateProcurement(organizationId: string, id: string, data: {
  status?: string; deliveryDate?: string; notes?: string
}) {
  const existing = await db.poultryProcurement.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Procurement not found')

  const updateData: Record<string, unknown> = {}
  if (data.status !== undefined) updateData.status = data.status
  if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null
  if (data.notes !== undefined) updateData.notes = data.notes

  const record = await db.poultryProcurement.update({ where: { id }, data: updateData })
  return apiEnvelope(record)
}

export async function deleteProcurement(organizationId: string, id: string) {
  const existing = await db.poultryProcurement.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Procurement not found')
  await db.poultryProcurement.delete({ where: { id } })
  return apiEnvelope({ deleted: true })
}

export async function getProcurementSummary(organizationId: string, opts?: { from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const [totals, byType] = await Promise.all([
    db.poultryProcurement.aggregate({ where, _sum: { totalCostUsd: true }, _count: true }),
    db.poultryProcurement.groupBy({ where, by: ['type'], _sum: { totalCostUsd: true, quantity: true }, _count: true }),
  ])

  return apiEnvelope({
    totalRecords: totals._count,
    totalCostUsd: totals._sum.totalCostUsd ?? 0,
    byType: byType.map(t => ({ type: t.type, count: t._count, totalCostUsd: t._sum.totalCostUsd ?? 0, totalQuantity: t._sum.quantity ?? 0 })),
  })
}