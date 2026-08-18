// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Billing & Entitlement Platform
// Barrel export for all billing modules
// ══════════════════════════════════════════════════════════════════

// Plans & Features
export { createPlan, getPlanWithVersions, listPlans, getSystemPlans, updatePlan, archivePlan, createPlanVersion, getLatestPlanVersion, parseVersionFeatures, registerFeature, listFeatures, getFeatureByKey } from './plans'

// Subscriptions
export { createSubscription, transitionSubscription, upgradeSubscription, checkDowngradeSafety, downgradeSubscription, cancelSubscription, getSubscriptionByOrg, hasActiveAccess, listSubscriptions, handlePaymentFailed, handlePaymentSucceeded, checkExpiredSubscriptions, checkExpiredTrials, getBillingMetrics } from './subscriptions'

// Entitlements
export { checkEntitlement, checkEntitlementWithQuantity, getOrganizationEntitlements, checkDomainEntitlement, checkModuleEntitlement, isFeatureEnabled, getEntitlementSummary } from './entitlements'

// Usage Metering
export { ensureDefaultMeters, listMeters, recordUsage, getCurrentUsage, getUsageSnapshot, recordAiUsage, getAiBudgetStatus, checkUsageThresholds, listUsageRecords } from './usage'

// Invoices
export { generateInvoice, issueInvoice, markInvoicePaid, listInvoices, getInvoice, parseLineItems, getInvoiceSummary } from './invoices'

// Payment Provider
export { StripeAdapter, registerProvider, getProvider, listProviders, reconcileSubscription } from './payment-provider'
export type { ReconciliationDiff } from './payment-provider'

// Types
export * from './types'