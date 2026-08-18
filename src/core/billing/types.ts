// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Billing & Entitlement Types
// ══════════════════════════════════════════════════════════════════

// ── Subscription Lifecycle ──

export const SUBSCRIPTION_STATES = [
  'trialing', 'active', 'past_due', 'grace_period',
  'paused', 'cancelled', 'expired', 'suspended',
] as const
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number]

export const ACTIVE_ACCESS_STATES: SubscriptionState[] = [
  'trialing', 'active', 'grace_period',
]

export const RESTRICTED_STATES: SubscriptionState[] = [
  'past_due', 'paused', 'cancelled',
]

export const NO_ACCESS_STATES: SubscriptionState[] = [
  'expired', 'suspended',
]

// Valid state transitions: from -> [to, ...]
export const SUBSCRIPTION_TRANSITIONS: Record<SubscriptionState, SubscriptionState[]> = {
  trialing:      ['active', 'cancelled', 'expired', 'suspended'],
  active:        ['past_due', 'paused', 'cancelled', 'suspended'],
  past_due:      ['active', 'grace_period', 'suspended', 'cancelled'],
  grace_period:  ['active', 'suspended', 'cancelled'],
  paused:        ['active', 'cancelled'],
  cancelled:     ['active', 'expired'],
  expired:       ['active'],
  suspended:     ['active', 'cancelled'],
}

// ── Entitlement ──

export type EntitlementStatus = 'enabled' | 'disabled' | 'limited' | 'trial' | 'expired' | 'suspended'

export interface FeatureEntitlement {
  featureKey: string
  status: EntitlementStatus
  limit?: number
  currentUsage?: number
  resetAt?: string
}

export interface EntitlementCheckResult {
  allowed: boolean
  reason?: string
  entitlement?: FeatureEntitlement
}

// ── Plans ──

export type BillingCycle = 'monthly' | 'yearly' | 'one_time'
export type PlanStatus = 'draft' | 'active' | 'archived' | 'deprecated'

export interface PlanFeatureDef {
  key: string
  name: string
  description?: string
  category?: string
}

export interface PlanLimitDef {
  key: string
  value: number
  unit: string
  description?: string
}

export interface PlanVersionData {
  features: PlanFeatureDef[]
  limits?: PlanLimitDef[]
  seatAllowance: number
  aiTokenAllowance: number
}

// ── Usage ──

export type MeterType = 'counter' | 'gauge' | 'unique'
export type OverageBehavior = 'hard_limit' | 'soft_limit' | 'auto_overage' | 'prepaid_credits'

export interface UsageMeterDef {
  key: string
  name: string
  description?: string
  unit: string
  meterType: MeterType
  aggregation: string
  resetCycle: string
  overageBehavior: OverageBehavior
  defaultLimit?: number
}

export interface UsageSnapshot {
  meterKey: string
  quantity: number
  limit: number | null
  percentage: number
  overageBehavior: OverageBehavior
}

export interface UsageIngestResult {
  accepted: boolean
  idempotent: boolean
  meterKey: string
  quantity: number
  currentTotal: number
  limit: number | null
  overLimit: boolean
}

// ── AI Usage ──

export const AI_METER_KEYS = [
  'ai.requests',
  'ai.input_tokens',
  'ai.output_tokens',
  'ai.total_tokens',
  'ai.tool_calls',
  'ai.agent_runs',
] as const

export interface AiUsageSnapshot {
  requests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  toolCalls: number
  agentRuns: number
  estimatedCost: number
  budget: number
  budgetPercent: number
}

// ── Invoices ──

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'failed' | 'voided'
export type InvoiceLineType = 'base_plan' | 'domain' | 'module' | 'seats' | 'usage' | 'ai_usage' | 'add_on' | 'credit' | 'discount' | 'tax'

export interface InvoiceLineItem {
  type: InvoiceLineType
  description: string
  quantity?: number
  unitPrice: number
  amount: number
  metadata?: Record<string, unknown>
}

export interface InvoiceData {
  invoiceNumber: string
  periodStart: string
  periodEnd: string
  currency: string
  subtotal: number
  discount: number
  tax: number
  total: number
  lineItems: InvoiceLineItem[]
}

// ── Billing Events ──

export const BILLING_EVENTS = [
  'subscription.created', 'subscription.activated', 'subscription.upgraded',
  'subscription.downgraded', 'subscription.cancelled', 'subscription.expired',
  'subscription.suspended', 'payment.succeeded', 'payment.failed',
  'invoice.created', 'invoice.paid', 'invoice.failed',
  'trial.started', 'trial.ended', 'trial.converted',
  'entitlement.changed', 'usage.threshold.reached',
] as const

// ── Payment Provider ──

export interface PaymentProviderAdapter {
  name: string
  createCustomer(orgId: string, data: Record<string, unknown>): Promise<{ externalId: string }>
  createSubscription(externalCustomerId: string, planExternalId: string): Promise<{ externalId: string; status: string }>
  cancelSubscription(externalSubscriptionId: string): Promise<{ status: string }>
  updatePaymentMethod(externalCustomerId: string, token: string): Promise<void>
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean
  parseWebhookEvent(payload: string): { type: string; data: Record<string, unknown> }
}

// ── AI Budget Controls ──

export type BudgetWarningLevel = 'none' | 'warn_80' | 'warn_90' | 'restricted'

export interface AiBudgetStatus {
  monthlyBudget: number
  spent: number
  remaining: number
  percentUsed: number
  warningLevel: BudgetWarningLevel
  resetAt: string
}

// ── Downgrade Safety ──

export type DowngradeAction = 'block' | 'schedule' | 'restrict_new' | 'allow'

export interface DowngradeCheckResult {
  canDowngrade: boolean
  action: DowngradeAction
  conflicts: { feature: string; current: number; newLimit: number }[]
}
