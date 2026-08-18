// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Usage Metering Service
// Idempotent recording, aggregation, AI usage tracking, budget controls
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { UsageIngestResult, UsageSnapshot, AiBudgetStatus, BudgetWarningLevel, OverageBehavior } from './types'
import { AI_METER_KEYS } from './types'
import { parseVersionFeatures } from './plans'

// ── Register Usage Meters ──

const DEFAULT_METERS: Array<{
  key: string; name: string; description?: string; unit: string;
  meterType: 'counter' | 'gauge' | 'unique'; resetCycle: string;
  overageBehavior: OverageBehavior; defaultLimit?: number;
}> = [
  { key: 'api.requests', name: 'API Requests', description: 'Total API requests made', unit: 'request', meterType: 'counter', resetCycle: 'monthly', overageBehavior: 'hard_limit', defaultLimit: 10000 },
  { key: 'storage.bytes', name: 'Storage', description: 'File storage used', unit: 'byte', meterType: 'gauge', resetCycle: 'never', overageBehavior: 'soft_limit', defaultLimit: 21474836480 },
  { key: 'members.active', name: 'Active Members', description: 'Active organization members', unit: 'member', meterType: 'counter', resetCycle: 'never', overageBehavior: 'hard_limit' },
  { key: 'messages.sent', name: 'Messages Sent', description: 'Automated messages sent', unit: 'message', meterType: 'counter', resetCycle: 'monthly', overageBehavior: 'hard_limit', defaultLimit: 1000 },
  ...AI_METER_KEYS.map(key => ({
    key,
    name: key.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
    description: `AI usage: ${key}`,
    unit: key.includes('token') ? 'token' : 'count',
    meterType: 'counter' as const,
    resetCycle: 'monthly',
    overageBehavior: 'soft_limit' as OverageBehavior,
  })),
]

export async function ensureDefaultMeters() {
  for (const meter of DEFAULT_METERS) {
    await db.usageMeter.upsert({
      where: { key: meter.key },
      update: { name: meter.name, description: meter.description },
      create: meter,
    })
  }
  return db.usageMeter.findMany({ orderBy: { key: 'asc' } })
}

export async function listMeters() {
  return db.usageMeter.findMany({ orderBy: { key: 'asc' } })
}

// ── Idempotent Usage Recording ──

export async function recordUsage(params: {
  organizationId: string
  meterKey: string
  quantity: number
  unit?: string
  source?: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
  occurredAt?: Date
}): Promise<UsageIngestResult> {
  const idempotencyKey = params.idempotencyKey ?? `${params.meterKey}:${params.organizationId}:${randomUUID()}`

  // Idempotency check
  const existing = await db.usageRecord.findUnique({ where: { idempotencyKey } })
  if (existing) {
    const total = await getCurrentUsage(params.organizationId, params.meterKey)
    return {
      accepted: true,
      idempotent: true,
      meterKey: params.meterKey,
      quantity: params.quantity,
      currentTotal: total,
      limit: null,
      overLimit: false,
    }
  }

  // Get meter config
  const meter = await db.usageMeter.findUnique({ where: { key: params.meterKey } })

  // Determine effective limit: plan version limit overrides meter default
  let limit = meter?.defaultLimit ?? null
  const sub = await db.subscription.findUnique({
    where: { organizationId: params.organizationId },
    include: { planVersion: true },
  })
  if (sub?.planVersion) {
    const versionData = parseVersionFeatures(sub.planVersion)
    const planLimit = versionData.limits?.find(l => l.key === params.meterKey)
    if (planLimit) limit = planLimit.value
  }

  // Create usage record
  await db.usageRecord.create({
    data: {
      organizationId: params.organizationId,
      meterKey: params.meterKey,
      quantity: params.quantity,
      unit: params.unit ?? meter?.unit ?? 'count',
      source: params.source,
      idempotencyKey,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      occurredAt: params.occurredAt ?? new Date(),
    },
  })

  const currentTotal = await getCurrentUsage(params.organizationId, params.meterKey)
  const overLimit = limit !== null && currentTotal > limit

  return {
    accepted: true,
    idempotent: false,
    meterKey: params.meterKey,
    quantity: params.quantity,
    currentTotal,
    limit,
    overLimit,
  }
}

// ── Get Current Usage (current billing period) ──

export async function getCurrentUsage(organizationId: string, meterKey: string): Promise<number> {
  const sub = await db.subscription.findUnique({ where: { organizationId }, select: { currentPeriodStart: true } })
  const periodStart = sub?.currentPeriodStart ?? new Date(0)

  const result = await db.usageRecord.aggregate({
    where: { organizationId, meterKey, occurredAt: { gte: periodStart } },
    _sum: { quantity: true },
  })
  return result._sum.quantity ?? 0
}

// ── Get Usage Snapshot (all meters for an org) ──

export async function getUsageSnapshot(organizationId: string): Promise<UsageSnapshot[]> {
  const meters = await listMeters()
  const snapshots: UsageSnapshot[] = []

  // Get plan-based limits for this org
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    include: { planVersion: true },
  })
  const planLimits: Record<string, number> = {}
  if (sub?.planVersion) {
    const versionData = parseVersionFeatures(sub.planVersion)
    for (const l of versionData.limits) {
      planLimits[l.key] = l.value
    }
  }

  for (const meter of meters) {
    const quantity = await getCurrentUsage(organizationId, meter.key)
    const effectiveLimit = planLimits[meter.key] ?? meter.defaultLimit
    snapshots.push({
      meterKey: meter.key,
      quantity: Math.round(quantity),
      limit: effectiveLimit,
      percentage: effectiveLimit ? Math.round((quantity / effectiveLimit) * 100) : 0,
      overageBehavior: meter.overageBehavior as OverageBehavior,
    })
  }
  return snapshots
}

// ── AI Usage Tracking ──

export async function recordAiUsage(organizationId: string, data: {
  inputTokens: number
  outputTokens: number
  model: string
  provider: string
  agentSlug?: string
  toolCalls?: number
  /**
   * Caller-provided idempotency key (e.g. message ID).
   * Required to prevent double-counting on retries.
   * If omitted, a random key is generated (no dedup guarantee).
   */
  idempotencyKey?: string
}) {
  const results = []
  // Use caller-provided base key; fall back to random UUID (no dedup guarantee)
  const base = data.idempotencyKey ?? randomUUID()

  results.push(await recordUsage({ organizationId, meterKey: 'ai.requests', quantity: 1, source: 'ai-chat', idempotencyKey: `${base}:req` }))
  results.push(await recordUsage({ organizationId, meterKey: 'ai.input_tokens', quantity: data.inputTokens, source: 'ai-chat', idempotencyKey: `${base}:in` }))
  results.push(await recordUsage({ organizationId, meterKey: 'ai.output_tokens', quantity: data.outputTokens, source: 'ai-chat', idempotencyKey: `${base}:out` }))
  results.push(await recordUsage({ organizationId, meterKey: 'ai.total_tokens', quantity: data.inputTokens + data.outputTokens, source: 'ai-chat', idempotencyKey: `${base}:total` }))
  if (data.toolCalls && data.toolCalls > 0) {
    results.push(await recordUsage({ organizationId, meterKey: 'ai.tool_calls', quantity: data.toolCalls, source: 'ai-chat', idempotencyKey: `${base}:tc` }))
  }

  return results
}

// ── AI Budget Status ──

export async function getAiBudgetStatus(organizationId: string): Promise<AiBudgetStatus> {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    include: { planVersion: true },
  })
  const budget = sub?.planVersion?.aiTokenAllowance ?? 0

  const totalTokens = await getCurrentUsage(organizationId, 'ai.total_tokens')
  const inputTokens = await getCurrentUsage(organizationId, 'ai.input_tokens')
  const outputTokens = await getCurrentUsage(organizationId, 'ai.output_tokens')
  const requests = await getCurrentUsage(organizationId, 'ai.requests')
  const toolCalls = await getCurrentUsage(organizationId, 'ai.tool_calls')
  const agentRuns = await getCurrentUsage(organizationId, 'ai.agent_runs')

  const percentUsed = budget > 0 ? Math.round((totalTokens / budget) * 100) : 0

  // Estimate cost (rough average pricing)
  const estimatedCost = (inputTokens * 0.000003) + (outputTokens * 0.000015) // ~$3/M input, $15/M output

  let warningLevel: BudgetWarningLevel = 'none'
  if (percentUsed >= 100) warningLevel = 'restricted'
  else if (percentUsed >= 90) warningLevel = 'warn_90'
  else if (percentUsed >= 80) warningLevel = 'warn_80'

  const nextPeriod = sub?.currentPeriodEnd ?? new Date(Date.now() + 30 * 86400000)

  return {
    monthlyBudget: budget,
    spent: Math.round(totalTokens),
    remaining: Math.max(0, budget - Math.round(totalTokens)),
    percentUsed,
    warningLevel,
    resetAt: nextPeriod.toISOString(),
  }
}

// ── Usage Threshold Checks ──

export async function checkUsageThresholds(organizationId: string): Promise<Array<{ meterKey: string; percent: number; level: string }>> {
  const snapshot = await getUsageSnapshot(organizationId)
  const alerts: Array<{ meterKey: string; percent: number; level: string }> = []

  for (const s of snapshot) {
    if (s.limit && s.percentage >= 100) {
      alerts.push({ meterKey: s.meterKey, percent: s.percentage, level: 'overage' })
    } else if (s.limit && s.percentage >= 90) {
      alerts.push({ meterKey: s.meterKey, percent: s.percentage, level: 'warning_90' })
    } else if (s.limit && s.percentage >= 80) {
      alerts.push({ meterKey: s.meterKey, percent: s.percentage, level: 'warning_80' })
    }
  }

  return alerts
}

// ── Usage Records Query ──

export async function listUsageRecords(organizationId: string, filters?: { meterKey?: string; limit?: number }) {
  return db.usageRecord.findMany({
    where: { organizationId, ...(filters?.meterKey && { meterKey: filters.meterKey }) },
    orderBy: { occurredAt: 'desc' },
    take: filters?.limit ?? 50,
  })
}
