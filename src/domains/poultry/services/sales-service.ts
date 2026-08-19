// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry Sales Service
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

// ── Customers ──

export async function listCustomers(organizationId: string) {
  const customers = await db.poultryCustomer.findMany({
    where: { organizationId },
    include: { _count: { select: { sales: true } } },
    orderBy: { name: 'asc' },
  })
  return apiEnvelope(customers)
}

export async function createCustomer(organizationId: string, data: {
  name: string; phone?: string; email?: string; address?: string
}) {
  const customer = await db.poultryCustomer.create({
    data: { organizationId, name: data.name, phone: data.phone, email: data.email, address: data.address },
  })
  return apiEnvelope(customer, undefined, 201)
}

// ── Sales ──

export async function listSales(organizationId: string, opts?: { status?: string; customerId?: string; from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId }
  if (opts?.status) where.status = opts.status
  if (opts?.customerId) where.customerId = opts.customerId
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const sales = await db.poultrySale.findMany({
    where,
    include: { customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { date: 'desc' },
    take: 100,
  })
  return apiEnvelope(sales)
}

export async function createSale(organizationId: string, data: {
  customerId?: string; items: object; totalAmount: number; currency?: string; date?: string; notes?: string
}) {
  // Verify customer if provided
  if (data.customerId) {
    const customer = await db.poultryCustomer.findFirst({ where: { id: data.customerId, organizationId } })
    if (!customer) return apiEnvelope(null, 'Customer not found')
  }

  const sale = await db.poultrySale.create({
    data: {
      organizationId, customerId: data.customerId ?? null,
      items: JSON.stringify(data.items), totalAmount: data.totalAmount,
      currency: data.currency ?? 'USD', date: data.date ? new Date(data.date) : new Date(),
      status: 'completed', notes: data.notes,
    },
  })
  return apiEnvelope(sale, undefined, 201)
}

export async function updateSale(organizationId: string, id: string, data: {
 status?: string; notes?: string; totalAmount?: number
}) {
  const existing = await db.poultrySale.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Sale not found')

  const updateData: Record<string, unknown> = {}
  if (data.status !== undefined) updateData.status = data.status
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount

  const sale = await db.poultrySale.update({ where: { id }, data: updateData })
  return apiEnvelope(sale)
}

export async function deleteSale(organizationId: string, id: string) {
  const existing = await db.poultrySale.findFirst({ where: { id, organizationId } })
  if (!existing) return apiEnvelope(null, 'Sale not found')
  await db.poultrySale.delete({ where: { id } })
  return apiEnvelope({ deleted: true })
}

export async function getSalesSummary(organizationId: string, opts?: { from?: string; to?: string }) {
  const where: Record<string, unknown> = { organizationId, status: 'completed' }
  if (opts?.from || opts?.to) {
    const dateFilter: Record<string, unknown> = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) dateFilter.lte = new Date(opts.to)
    where.date = dateFilter
  }

  const [totals, pendingCount, customerCount] = await Promise.all([
    db.poultrySale.aggregate({ where, _sum: { totalAmount: true }, _count: true }),
    db.poultrySale.count({ where: { organizationId, status: 'pending' } }),
    db.poultryCustomer.count({ where: { organizationId } }),
  ])

  return apiEnvelope({
    completedSales: totals._count,
    totalRevenue: totals._sum.totalAmount ?? 0,
    pendingSales: pendingCount,
    totalCustomers: customerCount,
  })
}