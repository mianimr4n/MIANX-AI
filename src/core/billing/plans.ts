// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Plan Management
// CRUD + versioning for commercial plans
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import type { PlanVersionData, PlanFeatureDef, PlanLimitDef, PlanStatus, BillingCycle } from './types'

type CreatePlanInput = {
  name: string
  slug: string
  description?: string
  billingCycle?: BillingCycle
  basePrice?: number
  currency?: string
  organizationId?: string
  isSystem?: boolean
  versionData?: PlanVersionData
}

export async function createPlan(input: CreatePlanInput) {
  const { versionData, ...planData } = input

  const plan = await db.plan.create({
    data: {
      ...planData,
      billingCycle: planData.billingCycle ?? 'monthly',
      basePrice: planData.basePrice ?? 0,
      currency: planData.currency ?? 'USD',
      status: 'draft',
      isSystem: planData.isSystem ?? false,
    },
  })

  // Create initial version if provided
  if (versionData) {
    await createPlanVersion(plan.id, 1, versionData)
  }

  return getPlanWithVersions(plan.id)
}

export async function getPlanWithVersions(planId: string) {
  return db.plan.findUnique({
    where: { id: planId },
    include: { versions: { orderBy: { version: 'desc' } } },
  })
}

export async function listPlans(filters?: { status?: PlanStatus; includeSystem?: boolean; organizationId?: string }) {
  return db.plan.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(!filters?.includeSystem && { isSystem: false }),
      ...(filters?.organizationId && { organizationId: filters.organizationId }),
    },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSystemPlans() {
  return db.plan.findMany({
    where: { isSystem: true, status: 'active' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    orderBy: { basePrice: 'asc' },
  })
}

export async function updatePlan(planId: string, data: { name?: string; description?: string; basePrice?: number; currency?: string; status?: PlanStatus }) {
  return db.plan.update({ where: { id: planId }, data })
}

export async function archivePlan(planId: string) {
  return db.plan.update({ where: { id: planId }, data: { status: 'archived' } })
}

// ── Plan Versioning ──

export async function createPlanVersion(planId: string, version: number, data: PlanVersionData) {
  // Check if version already exists
  const existing = await db.planVersion.findUnique({
    where: { planId_version: { planId, version } },
  })
  if (existing) {
    throw new Error(`Plan version v${version} already exists for plan ${planId}`)
  }

  return db.planVersion.create({
    data: {
      planId,
      version,
      name: data.features.map(f => f.name).join(', ') || `Version ${version}`,
      features: JSON.stringify(data.features),
      limits: data.limits ? JSON.stringify(data.limits) : null,
      seatAllowance: data.seatAllowance ?? 1,
      aiTokenAllowance: data.aiTokenAllowance ?? 0,
      status: 'active',
    },
  })
}

export async function getLatestPlanVersion(planId: string) {
  return db.planVersion.findFirst({
    where: { planId, status: 'active' },
    orderBy: { version: 'desc' },
  })
}

export function parseVersionFeatures(version: { features: string; limits?: string | null; seatAllowance: number; aiTokenAllowance: number }) {
  const features: PlanFeatureDef[] = JSON.parse(version.features)
  const limits: PlanLimitDef[] = version.limits ? JSON.parse(version.limits) : []
  return {
    features,
    limits,
    seatAllowance: version.seatAllowance,
    aiTokenAllowance: version.aiTokenAllowance,
  }
}

// ── Feature Registry ──

export async function registerFeature(key: string, name: string, description?: string, category?: string) {
  return db.feature.upsert({
    where: { key },
    update: { name, description, category },
    create: { key, name, description, category },
  })
}

export async function listFeatures(category?: string) {
  return db.feature.findMany({
    where: category ? { category } : undefined,
    orderBy: { key: 'asc' },
  })
}

export async function getFeatureByKey(key: string) {
  return db.feature.findUnique({ where: { key } })
}
