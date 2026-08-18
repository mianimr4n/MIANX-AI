// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Subscription Lifecycle Management
// State machine: trialing → active → past_due → grace_period → suspended
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import type { SubscriptionState, DowngradeCheckResult, DowngradeAction } from './types'
import { SUBSCRIPTION_TRANSITIONS, ACTIVE_ACCESS_STATES, NO_ACCESS_STATES } from './types'
import { getLatestPlanVersion, parseVersionFeatures } from './plans'

function validateTransition(from: SubscriptionState, to: SubscriptionState) {
  const allowed = SUBSCRIPTION_TRANSITIONS[from]
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Invalid subscription transition: ${from} → ${to}. Allowed: [${allowed?.join(', ')}]`)
  }
}

function getPeriodDates(billingCycle: 'monthly' | 'yearly'): { start: Date; end: Date } {
  const start = new Date()
  const end = new Date(start)
  if (billingCycle === 'yearly') {
    end.setFullYear(end.getFullYear() + 1)
  } else {
    end.setMonth(end.getMonth() + 1)
  }
  return { start, end }
}

// ── Create Subscription ──

export async function createSubscription(organizationId: string, planVersionId: string, options?: {
  trialDays?: number
  seatCount?: number
  planId?: string
}) {
  const planVersion = await db.planVersion.findUnique({
    where: { id: planVersionId },
    include: { plan: true },
  })
  if (!planVersion) throw new Error(`Plan version ${planVersionId} not found`)

  // Check org doesn't already have a subscription
  const existing = await db.subscription.findUnique({ where: { organizationId } })
  if (existing) throw new Error(`Organization ${organizationId} already has a subscription`)

  const trialEndsAt = options?.trialDays ? new Date(Date.now() + options.trialDays * 86400000) : null
  const isTrial = !!trialEndsAt

  const { start, end } = getPeriodDates(planVersion.plan.billingCycle as 'monthly' | 'yearly')

  return db.subscription.create({
    data: {
      organizationId,
      planId: options?.planId ?? planVersion.planId,
      planVersionId,
      state: isTrial ? 'trialing' : 'active',
      trialEndsAt,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      seatCount: options?.seatCount ?? planVersion.seatAllowance,
    },
    include: { plan: true, planVersion: true },
  })
}

// ── Transition State ──

export async function transitionSubscription(subscriptionId: string, newState: SubscriptionState, metadata?: Record<string, unknown>) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`)

  validateTransition(sub.state, newState)

  const updates: Record<string, unknown> = { state: newState }
  if (newState === 'cancelled') updates.canceledAt = new Date()
  if (newState === 'paused') updates.pausedAt = new Date()
  if (newState === 'expired') updates.expiresAt = new Date()
  if (newState === 'active') {
    // Reset period on reactivation
    const planVersion = await db.planVersion.findUnique({
      where: { id: sub.planVersionId },
      include: { plan: true },
    })
    if (planVersion) {
      const { start, end } = getPeriodDates(planVersion.plan.billingCycle as 'monthly' | 'yearly')
      updates.currentPeriodStart = start
      updates.currentPeriodEnd = end
    }
  }
  if (metadata) updates.metadata = JSON.stringify({ ...((sub.metadata && JSON.parse(sub.metadata)) || {}), ...metadata })

  return db.subscription.update({
    where: { id: subscriptionId },
    data: updates,
    include: { plan: true, planVersion: true },
  })
}

// ── Upgrade ──

export async function upgradeSubscription(subscriptionId: string, newPlanVersionId: string) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`)
  if (!ACTIVE_ACCESS_STATES.includes(sub.state)) {
    throw new Error(`Cannot upgrade subscription in state: ${sub.state}`)
  }

  const newVersion = await db.planVersion.findUnique({
    where: { id: newPlanVersionId },
    include: { plan: true },
  })
  if (!newVersion) throw new Error(`Plan version ${newPlanVersionId} not found`)

  const { start, end } = getPeriodDates(newVersion.plan.billingCycle as 'monthly' | 'yearly')

  return db.subscription.update({
    where: { id: subscriptionId },
    data: {
      planId: newVersion.planId,
      planVersionId: newPlanVersionId,
      state: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      metadata: JSON.stringify({
        ...(sub.metadata ? JSON.parse(sub.metadata) : {}),
        lastUpgradeAt: new Date().toISOString(),
        previousPlanVersionId: sub.planVersionId,
      }),
    },
    include: { plan: true, planVersion: true },
  })
}

// ── Downgrade Safety ──

export async function checkDowngradeSafety(subscriptionId: string, newPlanVersionId: string): Promise<DowngradeCheckResult> {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`)

  const currentVersion = await db.planVersion.findUnique({ where: { id: sub.planVersionId } })
  const newVersion = await db.planVersion.findUnique({ where: { id: newPlanVersionId } })
  if (!currentVersion || !newVersion) throw new Error('Plan version not found')

  const currentData = parseVersionFeatures(currentVersion)
  const newData = parseVersionFeatures(newVersion)

  const conflicts: { feature: string; current: number; newLimit: number }[] = []
  for (const newLimit of newData.limits) {
    const currentLimit = currentData.limits.find(l => l.key === newLimit.key)
    if (currentLimit && newLimit.value < currentLimit.value) {
      // In production, we'd check actual usage here
      // For now, we just flag the limit decrease
      conflicts.push({
        feature: newLimit.key,
        current: currentLimit.value,
        newLimit: newLimit.value,
      })
    }
  }

  let action: DowngradeAction = 'allow'
  if (conflicts.length > 0) {
    action = 'restrict_new' // Default: allow downgrade but restrict new creation
  }

  return { canDowngrade: true, action, conflicts }
}

export async function downgradeSubscription(subscriptionId: string, newPlanVersionId: string) {
  const check = await checkDowngradeSafety(subscriptionId, newPlanVersionId)
  if (!check.canDowngrade) throw new Error('Downgrade not safe')

  return upgradeSubscription(subscriptionId, newPlanVersionId) // Same logic, just going to cheaper plan
}

// ── Cancel ──

export async function cancelSubscription(subscriptionId: string, immediate: boolean = false) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`)

  if (immediate || sub.state === 'trialing') {
    return transitionSubscription(subscriptionId, 'cancelled')
  }
  // End-of-period: mark cancelled but keep access until period end
  return db.subscription.update({
    where: { id: subscriptionId },
    data: { canceledAt: new Date() },
    include: { plan: true, planVersion: true },
  })
}

// ── Query ──

export async function getSubscriptionByOrg(organizationId: string) {
  return db.subscription.findUnique({
    where: { organizationId },
    include: { plan: true, planVersion: true, invoices: { orderBy: { createdAt: 'desc' }, take: 5 } },
  })
}

export async function hasActiveAccess(organizationId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { organizationId }, select: { state: true, currentPeriodEnd: true } })
  if (!sub) return false
  return ACTIVE_ACCESS_STATES.includes(sub.state) && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date())
}

export async function listSubscriptions(filters?: { state?: SubscriptionState }) {
  return db.subscription.findMany({
    where: filters?.state ? { state: filters.state } : undefined,
    include: { plan: true, planVersion: true, organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

// ── Payment Failure Flow ──

export async function handlePaymentFailed(subscriptionId: string) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) return

  if (sub.state === 'active') {
    return transitionSubscription(subscriptionId, 'past_due', { lastPaymentFailedAt: new Date().toISOString() })
  }
  if (sub.state === 'past_due') {
    // Move to grace period
    return transitionSubscription(subscriptionId, 'grace_period', { enteredGraceAt: new Date().toISOString() })
  }
  if (sub.state === 'grace_period') {
    return transitionSubscription(subscriptionId, 'suspended', { suspendedAt: new Date().toISOString() })
  }
}

// ── Handle Payment Succeeded ──

export async function handlePaymentSucceeded(subscriptionId: string) {
  const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) return

  if (['past_due', 'grace_period'].includes(sub.state)) {
    return transitionSubscription(subscriptionId, 'active', { lastPaymentSucceededAt: new Date().toISOString() })
  }
}

// ── Expiry Check (cron-job callable) ──

export async function checkExpiredSubscriptions() {
  const now = new Date()
  const expired = await db.subscription.findMany({
    where: {
      state: { in: ['cancelled', 'trialing'] },
      currentPeriodEnd: { lte: now },
    },
  })
  const results = []
  for (const sub of expired) {
    const updated = await transitionSubscription(sub.id, 'expired')
    results.push(updated)
  }
  return results
}

// ── Trial Check (cron-job callable) ──

export async function checkExpiredTrials() {
  const now = new Date()
  const trials = await db.subscription.findMany({
    where: { state: 'trialing', trialEndsAt: { lte: now } },
  })
  const results = []
  for (const sub of trials) {
    const updated = await transitionSubscription(sub.id, 'expired')
    results.push(updated)
  }
  return results
}

// ── Commercial Metrics ──

export async function getBillingMetrics() {
  const [total, active, trialing, pastDue, suspended, churned] = await Promise.all([
    db.subscription.count(),
    db.subscription.count({ where: { state: 'active' } }),
    db.subscription.count({ where: { state: 'trialing' } }),
    db.subscription.count({ where: { state: { in: ['past_due', 'grace_period'] } } }),
    db.subscription.count({ where: { state: 'suspended' } }),
    db.subscription.count({ where: { state: { in: ['cancelled', 'expired'] } } }),
  ])

  // Calculate MRR from active subscriptions
  const activeSubs = await db.subscription.findMany({
    where: { state: 'active' },
    include: { plan: true },
  })
  const mrr = activeSubs.reduce((sum, s) => sum + (s.plan?.basePrice ?? 0), 0)

  return { total, active, trialing, pastDue, suspended, churned, mrr, arr: mrr * 12 }
}