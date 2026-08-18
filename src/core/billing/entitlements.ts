// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Entitlement Engine
// Answers: "Is this organization commercially allowed to use this capability?"
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import type { EntitlementCheckResult, FeatureEntitlement, EntitlementStatus, SubscriptionState } from './types'
import { ACTIVE_ACCESS_STATES, RESTRICTED_STATES } from './types'
import { parseVersionFeatures } from './plans'
import { hasActiveAccess } from './subscriptions'
import { getCurrentUsage } from './usage'

// ── Core Entitlement Check ──

export async function checkEntitlement(organizationId: string, featureKey: string): Promise<EntitlementCheckResult> {
  // 1. Check subscription access
  const hasAccess = await hasActiveAccess(organizationId)
  if (!hasAccess) {
    const sub = await db.subscription.findUnique({ where: { organizationId }, select: { state: true } })
    return {
      allowed: false,
      reason: `Subscription state '${sub?.state}' does not grant access`,
    }
  }

  // 2. Get subscription with plan version
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    include: { planVersion: true },
  })
  if (!sub || !sub.planVersion) {
    return { allowed: false, reason: 'No active subscription with plan version found' }
  }

  // 3. Parse features from plan version
  const versionData = parseVersionFeatures(sub.planVersion)
  const featureDef = versionData.features.find(f => f.key === featureKey)

  if (!featureDef) {
    return { allowed: false, reason: `Feature '${featureKey}' is not included in the current plan` }
  }

  // 4. Check limits against actual usage
  const limitDef = versionData.limits?.find(l => l.key === featureKey)
  const entitlement: FeatureEntitlement = {
    featureKey,
    status: 'enabled',
    limit: limitDef?.value,
  }

  if (sub.state === 'trialing') {
    entitlement.status = 'trial'
  }

  // Enforce limit: if feature has a meter key, check actual usage
  if (limitDef?.value !== undefined) {
    // Map feature keys to meter keys (e.g. 'ai.assistant' → 'ai.total_tokens')
    const meterKey = featureKeyToMeterKey(featureKey, versionData.features.map(f => f.key))
    if (meterKey) {
      const currentUsage = await getCurrentUsage(organizationId, meterKey)
      entitlement.currentUsage = currentUsage
      if (currentUsage >= limitDef.value) {
        entitlement.status = 'suspended'
        return {
          allowed: false,
          reason: `Feature '${featureKey}' has reached its limit: ${currentUsage}/${limitDef.value}`,
          entitlement,
        }
      }
    }
  }

  return { allowed: true, entitlement }
}

// ── Check with quantity context (e.g. seat count, storage) ──

export async function checkEntitlementWithQuantity(organizationId: string, featureKey: string, currentQuantity: number, requestedQuantity: number = 1): Promise<EntitlementCheckResult> {
  const check = await checkEntitlement(organizationId, featureKey)
  if (!check.allowed || !check.entitlement?.limit) return check

  const newTotal = currentQuantity + requestedQuantity
  if (newTotal > check.entitlement.limit) {
    return {
      allowed: false,
      reason: `Would exceed limit: ${currentQuantity} + ${requestedQuantity} = ${newTotal} > ${check.entitlement.limit}`,
      entitlement: {
        ...check.entitlement,
        currentUsage: currentQuantity,
      },
    }
  }

  return {
    allowed: true,
    entitlement: {
      ...check.entitlement,
      currentUsage: currentQuantity,
    },
  }
}

// ── Get All Entitlements for an Organization ──

export async function getOrganizationEntitlements(organizationId: string) {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    include: { plan: true, planVersion: true },
  })

  if (!sub || !sub.planVersion) {
    return { state: null as SubscriptionState | null, features: [] as FeatureEntitlement[], limits: [], aiTokenAllowance: 0, seatAllowance: 1 }
  }

  const versionData = parseVersionFeatures(sub.planVersion)

  const features: FeatureEntitlement[] = versionData.features.map(f => ({
    featureKey: f.key,
    status: (sub.state === 'trialing' ? 'trial' : sub.state === 'paused' ? 'suspended' : 'enabled') as EntitlementStatus,
    limit: versionData.limits?.find(l => l.key === f.key)?.value,
  }))

  return {
    state: sub.state,
    features,
    limits: versionData.limits ?? [],
    aiTokenAllowance: versionData.aiTokenAllowance,
    seatAllowance: versionData.seatAllowance,
  }
}

// ── Check Domain Entitlement ──

export async function checkDomainEntitlement(organizationId: string, domainSlug: string): Promise<EntitlementCheckResult> {
  return checkEntitlement(organizationId, `domain.${domainSlug}`)
}

// ── Check Module Entitlement ──

export async function checkModuleEntitlement(organizationId: string, moduleSlug: string): Promise<EntitlementCheckResult> {
  return checkEntitlement(organizationId, `module.${moduleSlug}`)
}

// ── Feature Key → Meter Key Mapping ──

function featureKeyToMeterKey(featureKey: string, allFeatures: string[]): string | null {
  // Direct mapping: feature key equals a meter key
  const directMap: Record<string, string> = {
    'ai.assistant': 'ai.total_tokens',
    'api.access': 'api.requests',
    'automation.workflows': 'api.requests',
  }
  if (directMap[featureKey]) return directMap[featureKey]

  // Convention: if the feature key matches a known meter key, use it
  return null
}

// ── Feature Flag Check (separate from entitlements) ──

export async function isFeatureEnabled(organizationId: string, featureKey: string): Promise<boolean> {
  const result = await checkEntitlement(organizationId, featureKey)
  return result.allowed
}

// ── Entitlement Summary for Dashboard ──

export async function getEntitlementSummary(organizationId: string) {
  const entitlements = await getOrganizationEntitlements(organizationId)
  const enabledCount = entitlements.features.filter(f => f.status === 'enabled' || f.status === 'trial').length
  const limitedCount = entitlements.features.filter(f => f.status === 'limited').length
  const disabledCount = entitlements.features.filter(f => f.status === 'disabled' || f.status === 'expired').length

  return {
    state: entitlements.state,
    totalFeatures: entitlements.features.length,
    enabled: enabledCount,
    limited: limitedCount,
    disabled: disabledCount,
    seatAllowance: entitlements.seatAllowance,
    aiTokenAllowance: entitlements.aiTokenAllowance,
  }
}