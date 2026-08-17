// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Tenant-Scoped Prisma Client Extension
// Automatically filters all queries by organization_id
// ══════════════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client'
import { getTenantContext, TenantContextError } from './tenant-context'

// Models that have organization_id and must be tenant-scoped
const TENANT_SCOPED_MODELS = new Set([
  'organizationMembership',
  'team',
  'teamMember',
  'setting',
  'file',
  'auditLog',
  'notification',
  'organizationDomain',
  'organizationModule',
] as const)

type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number]

function isTenantScoped(model: string): model is TenantScopedModel {
  return TENANT_SCOPED_MODELS.has(model as TenantScopedModel)
}

/**
 * Create a tenant-scoped Prisma client extension.
 * Wraps findMany, findFirst, findUnique, create, update, delete, upsert
 * to automatically inject organization_id filters.
 *
 * Usage:
 *   const tenantDb = db.$extends(withTenantScope())
 *   // Inside withTenant():
 *   const orgs = await tenantDb.team.findMany() // auto-filtered
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
            // Never allow overriding organization_id in client-supplied where
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
            // Reject if client tries to set organization_id
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
            // Always add organization_id to prevent cross-tenant mutations
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
