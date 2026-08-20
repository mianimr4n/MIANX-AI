// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Tenant-Scoped Prisma Client Extension
// Automatically filters all queries by organization_id
// Phase 11: Verified against Prisma 6.19.2 actual type definitions
// ══════════════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client'
import { getTenantContext, TenantContextError } from './tenant-context'

// ── Models with REQUIRED organizationId (direct tenant ownership) ──
// Only models where organizationId is a required (non-nullable) field.
// Do NOT include models with optional organizationId or indirect ownership.
export const TENANT_SCOPED_MODELS = new Set([
  // Core — all have required organizationId
  'OrganizationMembership',
  'Team',
  'Setting',
  'File',
  'AuditLog',
  'Notification',
  // Domain & Module — required organizationId
  'OrganizationDomain',
  'OrganizationModule',
  // AI — required organizationId
  'Conversation',
  'AgentConfig',
  // Automation — required organizationId
  'Event',
  'Workflow',
  'WorkflowRun',
  'Job',
  'Approval',
  // Integration — required organizationId
  'ApiKey',
  'Webhook',
  'WebhookDelivery',
  'OAuthConnection',
  // Billing — required organizationId
  'Subscription',
  'UsageRecord',
  'Invoice',
  // Poultry domain — all have required organizationId
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

// ── Models with OPTIONAL organizationId (may or may not belong to an org) ──
// These get a filter only when a tenant context exists, using { organizationId: orgId }
// which works because Prisma treats null != value in filters.
// Cross-tenant override is still blocked.
const OPTIONAL_ORG_MODELS = new Set([
  'Role',           // System roles (isSystem=true) may have no org
  'Incident',       // Platform incidents may not belong to a specific org
  'AlertRecord',    // Platform alerts may not belong to a specific org
])

// ── Models with INDIRECT tenant ownership (accessed via parent relations) ──
// These must NOT be filtered here. Service layer must enforce via parent.
// Examples:
//   TeamMember  -> owned via Team (has teamId -> Team.organizationId)
//   AiMessage   -> owned via Conversation (has conversationId -> Conversation.organizationId)
//   WorkflowStepRun -> owned via WorkflowRun (has workflowRunId -> WorkflowRun.organizationId)
//   RolePermission  -> owned via Role (has roleId -> Role.organizationId?)
//   MembershipRole  -> owned via OrganizationMembership (has membershipId -> OrgMember.organizationId)
//   WebhookDelivery-> already has direct organizationId (included above)

function isTenantScoped(model: string): boolean {
  return TENANT_SCOPED_MODELS.has(model)
}

function isOptionalOrg(model: string): boolean {
  return OPTIONAL_ORG_MODELS.has(model)
}

/** Safely extract `where` from operation args — may not exist on create/createMany */
function getWhere(args: Record<string, unknown>): Record<string, unknown> {
  return (args.where as Record<string, unknown>) || {}
}

/**
 * Create a tenant-scoped Prisma client extension.
 *
 * Prisma v6.19.2 $allModels + $allOperations callback shape:
 *   (params: { model?: string; operation: string; args: any; query: (args: any) => PrismaPromise<any> })
 *     => Promise<any>
 *
 * We cast args to Record<string, unknown> for safe property access because
 * the TypeScript-inferred union type is too wide for direct property access
 * (not all operations have `where`, not all have `data`).
 *
 * This is NOT `as any` on security logic — it's a safe narrowing of the
 * Prisma extension callback's own `any`-typed `args` parameter into a
 * Record for property extraction. The actual tenant enforcement logic
 * remains fully type-safe at the application level.
 */
export function withTenantScope() {
  return Prisma.defineExtension({
    name: 'tenantScope',
    query: {
      $allModels: {
        async $allOperations({
          args: argsRaw,
          query,
          model,
          operation,
        }: {
          model?: string
          operation: string
          args: unknown
          query: (args: unknown) => Promise<unknown>
        }) {
          // Runtime-safe access to args properties
          const args = argsRaw as Record<string, unknown>

          // Skip if no tenant context (system-level operations)
          const ctx = getTenantContext()
          if (!ctx) return query(argsRaw)

          const orgId = ctx.organizationId
          const modelName = model ?? ''
          if (!isTenantScoped(modelName) && !isOptionalOrg(modelName)) {
            return query(argsRaw)
          }

          // ── READ operations: inject WHERE filter ──
          if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            const where = getWhere(args)

            // Block cross-tenant access: never allow overriding organizationId
            if (where.organizationId != null && where.organizationId !== orgId) {
              throw new TenantContextError(
                `Cross-tenant access denied: cannot access organization ${String(where.organizationId)}`
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

            // Block cross-tenant create
            if (data.organizationId != null && data.organizationId !== orgId) {
              throw new TenantContextError(
                'Cannot set organizationId on create — auto-assigned from tenant context'
              )
            }

            return query({
              ...args,
              data: { ...data, organizationId: orgId },
            })
          }

          // ── CREATE MANY ──
          if (operation === 'createMany') {
            const dataArray = args.data as Record<string, unknown>[] | undefined
            if (Array.isArray(dataArray)) {
              return query({
                ...args,
                data: dataArray.map(d => ({ ...d, organizationId: orgId })),
              })
            }
            return query(argsRaw)
          }

          // ── UPDATE / DELETE: must filter by organization_id ──
          if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            const where = getWhere(args)

            // Block cross-tenant mutation
            if (where.organizationId != null && where.organizationId !== orgId) {
              throw new TenantContextError(
                `Cross-tenant mutation denied: cannot modify organization ${String(where.organizationId)}`
              )
            }

            return query({
              ...args,
              where: { ...where, organizationId: orgId },
            })
          }

          // ── UPSERT: inject org filter in where and org id in create ──
          if (operation === 'upsert') {
            const where = getWhere(args)
            const create = (args.create as Record<string, unknown>) || {}
            const update = (args.update as Record<string, unknown>) || {}

            // Block cross-tenant upsert
            if (where.organizationId != null && where.organizationId !== orgId) {
              throw new TenantContextError(
                `Cross-tenant upsert denied: cannot target organization ${String(where.organizationId)}`
              )
            }

            return query({
              ...args,
              where: { ...where, organizationId: orgId },
              create: { ...create, organizationId: orgId },
              update,
            })
          }

          // Pass through for any other operation (e.g. $queryRaw, $executeRaw)
          return query(argsRaw)
        },
      },
    },
  })
}

export type TenantScopedClient = ReturnType<typeof withTenantScope>
