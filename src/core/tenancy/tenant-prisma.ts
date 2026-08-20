// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Tenant-Scoped Prisma Client Extension
// Automatically filters all queries by organization_id
// Phase 11: Added all Poultry models to tenant scope
// ══════════════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client'
import { getTenantContext, TenantContextError } from './tenant-context'

// Phase 11: All models that have organization_id and must be tenant-scoped
// Prisma $allModels provides PascalCase names (e.g. 'Team', 'AuditLog')
const TENANT_SCOPED_MODELS = new Set([
  // Core
  'OrganizationMembership',
  'Team',
  'TeamMember',
  'Setting',
  'File',
  'AuditLog',
  'Notification',
  // Domain & Module
  'OrganizationDomain',
  'OrganizationModule',
  // AI
  'Conversation',
  'AgentConfig',
  // Automation
  'Event',
  'Workflow',
  'WorkflowRun',
  'Job',
  'Approval',
  // Integration
  'ApiKey',
  'Webhook',
  'WebhookDelivery',
  'OAuthConnection',
  // Billing
  'Subscription',
  'UsageRecord',
  'Invoice',
  // Observability
  'Incident',
  // Phase 11: Poultry domain models — CRITICAL tenant isolation
  'PoultryFarm',
  'PoultryShed',
  'PoultryFlock',
  'PoultryFeedRecord',
  'PoultryHealthRecord',
  'PoultryMortalityRecord',
  'PoultryProductionRecord',
  'PoultryCustomer',
  'PoultrySale',
  'PoultryProcurement',
])

function isTenantScoped(model: string): boolean {
  return TENANT_SCOPED_MODELS.has(model)
}

/**
 * Create a tenant-scoped Prisma client extension.
 * Wraps findMany, findFirst, findUnique, create, update, delete, upsert
 * to automatically inject organization_id filters.
 */
export function withTenantScope() {
  return Prisma.defineExtension({
    name: 'tenantScope',
    query: {
      $allModels: {
        async $allOperations({ args, query, model, operation }) {
          // Skip if no tenant context (system-level operations)
          const ctx = getTenantContext()
          if (!ctx || !isTenantScoped(model)) {
            return query(args)
          }

          const orgId = ctx.organizationId

          // ── READ operations: inject WHERE filter ──
          if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            const where = (args.where as Record<string, unknown>) || {}
            // Phase 11: Never allow overriding organization_id in client-supplied where
            if (where.organizationId && where.organizationId !== orgId) {
              throw new TenantContextError(
                `Cross-tenant access denied: cannot access organization ${where.organizationId}`
              )
            }
            return query({
              ...args,
              where: { ...where, organizationId: orgId },
            })
          }

          // ── CREATE: inject organization_id ──
          if (operation === 'create') {
            const data = (args.data as Record<string, unknown>) || {}
            if (data.organizationId && data.organizationId !== orgId) {
              throw new TenantContextError('Cannot set organizationId on create — auto-assigned from tenant context')
            }
            return query({
              ...args,
              data: { ...data, organizationId: orgId },
            })
          }

          // ── CREATE MANY ──
          if (operation === 'createMany') {
            return query({
              ...args,
              data: (args.data as Record<string, unknown>[]).map(d => ({
                ...d,
                organizationId: orgId,
              })),
            })
          }

          // ── UPDATE / DELETE: must filter by organization_id ──
          if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            const where = (args.where as Record<string, unknown>) || {}
            if (where.organizationId && where.organizationId !== orgId) {
              throw new TenantContextError(
                `Cross-tenant mutation denied: cannot modify organization ${where.organizationId}`
              )
            }
            return query({
              ...args,
              where: { ...where, organizationId: orgId },
            })
          }

          // ── UPSERT: inject org filter in where and org id in create ──
          if (operation === 'upsert') {
            const where = (args.where as Record<string, unknown>) || {}
            const create = (args.create as Record<string, unknown>) || {}
            const update = (args.update as Record<string, unknown>) || {}
            return query({
              ...args,
              where: { ...where, organizationId: orgId },
              create: { ...create, organizationId: orgId },
              update,
            })
          }

          return query(args)
        },
      },
    },
  })
}

export type TenantScopedClient = ReturnType<typeof withTenantScope>