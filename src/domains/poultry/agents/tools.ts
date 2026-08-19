// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry AI Tools
// Domain-specific tools for Poultry OS agents
// ══════════════════════════════════════════════════════

import { db } from '@/lib/db'
import type { ToolDefinition } from '@/ai/types'

const getFlockMetricsTool: ToolDefinition = {
  name: 'get_flock_metrics',
  description: 'Get key metrics for a specific flock: mortality rate, feed conversion, production data, age, and current count.',
  parameters: {
    type: 'object',
    properties: {
      flockId: { type: 'string', description: 'The flock ID to get metrics for' },
    },
  },
  requiredPermission: 'poultry.flock.view',
  async execute(args, ctx) {
    const flockId = String(args.flockId)
    const flock = await db.poultryFlock.findFirst({ where: { id: flockId, organizationId: ctx.organizationId } })
    if (!flock) return JSON.stringify({ error: 'Flock not found' })

    const [mortality, feed, production] = await Promise.all([
      db.poultryMortalityRecord.aggregate({ where: { flockId }, _sum: { count: true } }),
      db.poultryFeedRecord.aggregate({ where: { flockId }, _sum: { quantityKg: true, costUsd: true } }),
      db.poultryProductionRecord.aggregate({ where: { flockId }, _sum: { eggsCollected: true, totalWeightKg: true } }),
    ])

    const ageDays = Math.max(0, Math.floor((Date.now() - flock.placementDate.getTime()) / 86400000))
    const mortRate = flock.quantity > 0 ? ((mortality._sum.count ?? 0) / flock.quantity * 100).toFixed(2) : '0'

    return JSON.stringify({
      flockId, breed: flock.breed, status: flock.status, ageDays,
      placed: flock.quantity, current: flock.currentCount,
      mortality: mortality._sum.count ?? 0, mortalityRate: mortRate + '%',
      totalFeedKg: feed._sum.quantityKg ?? 0, totalFeedCost: feed._sum.costUsd ?? 0,
      totalEggs: production._sum.eggsCollected ?? 0, totalProductionKg: production._sum.totalWeightKg ?? 0,
    })
  },
}

const getMortalityTrendsTool: ToolDefinition = {
  name: 'get_mortality_trends',
  description: 'Get mortality records for a flock showing date, count, and cause. Useful for identifying health issues.',
  parameters: {
    type: 'object',
    properties: {
      flockId: { type: 'string', description: 'The flock ID' },
      limit: { type: 'number', description: 'Max records to return (default 10)' },
    },
  },
  requiredPermission: 'poultry.health.view',
  async execute(args, ctx) {
    const records = await db.poultryMortalityRecord.findMany({
      where: { flockId: String(args.flockId), organizationId: ctx.organizationId },
      orderBy: { date: 'desc' }, take: Math.min(Number(args.limit) || 10, 50),
    })
    return JSON.stringify(records)
  },
}

const getHealthRecordsTool: ToolDefinition = {
  name: 'get_health_records',
  description: 'Get health records (vaccinations, treatments, checkups) for a flock.',
  parameters: {
    type: 'object',
    properties: {
      flockId: { type: 'string', description: 'The flock ID' },
      type: { type: 'string', description: 'Filter by type: vaccination, treatment, checkup, emergency' },
    },
  },
  requiredPermission: 'poultry.health.view',
  async execute(args, ctx) {
    const where: Record<string, unknown> = { flockId: String(args.flockId), organizationId: ctx.organizationId }
    if (args.type) where.type = args.type
    const records = await db.poultryHealthRecord.findMany({
      where, orderBy: { date: 'desc' }, take: 20,
    })
    return JSON.stringify(records)
  },
}

const getFeedUsageTool: ToolDefinition = {
  name: 'get_feed_usage',
  description: 'Get feed consumption records for a flock with totals and cost data.',
  parameters: {
    type: 'object',
    properties: {
      flockId: { type: 'string', description: 'The flock ID' },
    },
  },
  requiredPermission: 'poultry.feed.view',
  async execute(args, ctx) {
    const records = await db.poultryFeedRecord.findMany({
      where: { flockId: String(args.flockId), organizationId: ctx.organizationId },
      orderBy: { date: 'desc' }, take: 20,
    })
    const totals = await db.poultryFeedRecord.aggregate({
      where: { flockId: String(args.flockId) },
      _sum: { quantityKg: true, costUsd: true },
    })
    return JSON.stringify({ records, totalKg: totals._sum.quantityKg ?? 0, totalCost: totals._sum.costUsd ?? 0 })
  },
}

const getProductionDataTool: ToolDefinition = {
  name: 'get_production_data',
  description: 'Get egg production and weight records for a flock.',
  parameters: {
    type: 'object',
    properties: {
      flockId: { type: 'string', description: 'The flock ID' },
    },
  },
  requiredPermission: 'poultry.production.view',
  async execute(args, ctx) {
    const records = await db.poultryProductionRecord.findMany({
      where: { flockId: String(args.flockId), organizationId: ctx.organizationId },
      orderBy: { date: 'desc' }, take: 20,
    })
    const totals = await db.poultryProductionRecord.aggregate({
      where: { flockId: String(args.flockId) },
      _sum: { eggsCollected: true, totalWeightKg: true },
    })
    return JSON.stringify({ records, totalEggs: totals._sum.eggsCollected ?? 0, totalKg: totals._sum.totalWeightKg ?? 0 })
  },
}

const getSalesDataTool: ToolDefinition = {
  name: 'get_sales_data',
  description: 'Get recent sales data and revenue summary for the organization.',
  parameters: {
    type: 'object',
    properties: {
      days: { type: 'number', description: 'Number of days to look back (default 30)' },
    },
  },
  requiredPermission: 'poultry.sale.view',
  async execute(args, ctx) {
    const days = Number(args.days) || 30
    const since = new Date(Date.now() - days * 86400000)
    const [sales, totals] = await Promise.all([
      db.poultrySale.findMany({
        where: { organizationId: ctx.organizationId, date: { gte: since } },
        include: { customer: { select: { name: true } } },
        orderBy: { date: 'desc' }, take: 20,
      }),
      db.poultrySale.aggregate({
        where: { organizationId: ctx.organizationId, status: 'completed', date: { gte: since } },
        _sum: { totalAmount: true }, _count: true,
      }),
    ])
    return JSON.stringify({ sales, totalRevenue: totals._sum.totalAmount ?? 0, completedSales: totals._count })
  },
}

const listPoultryFlocksTool: ToolDefinition = {
  name: 'list_poultry_flocks',
  description: 'List all flocks for the organization with their current status, breed, and shed info.',
  parameters: {},
  requiredPermission: 'poultry.flock.view',
  async execute(_args, ctx) {
    const flocks = await db.poultryFlock.findMany({
      where: { organizationId: ctx.organizationId },
      include: { shed: { select: { name: true, farm: { select: { name: true } } } } },
      orderBy: { placementDate: 'desc' },
    })
    return JSON.stringify(flocks.map(f => ({
      id: f.id, breed: f.breed, status: f.status,
      placed: f.quantity, current: f.currentCount,
      shed: f.shed.name, farm: f.shed.farm.name,
      placementDate: f.placementDate,
    })))
  },
}

const listPoultryFarmsTool: ToolDefinition = {
  name: 'list_poultry_farms',
  description: 'List all farms for the organization with shed and bird counts.',
  parameters: {},
  requiredPermission: 'poultry.farm.view',
  async execute(_args, ctx) {
    const farms = await db.poultryFarm.findMany({
      where: { organizationId: ctx.organizationId },
      include: { _count: { select: { sheds: true } } },
    })
    return JSON.stringify(farms)
  },
}

// ── Tool Registry ──

export const POULTRY_TOOLS: ToolDefinition[] = [
  listPoultryFarmsTool,
  listPoultryFlocksTool,
  getFlockMetricsTool,
  getMortalityTrendsTool,
  getHealthRecordsTool,
  getFeedUsageTool,
  getProductionDataTool,
  getSalesDataTool,
]
