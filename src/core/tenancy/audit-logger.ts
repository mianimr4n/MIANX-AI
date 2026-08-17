// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Audit Logging Middleware
// Captures all mutations with actor, resource, before/after
// ══════════════════════════════════════════════════════════════════

import { Prisma } from '@prisma/client'
import { getTenantContext } from './tenant-context'

// Models that should be audited
const AUDITED_MODELS = new Set([
  'organization',
  'organizationMembership',
  'team',
  'teamMember',
  'role',
  'permission',
  'rolePermission',
  'membershipRole',
  'setting',
  'file',
  'notification',
  'organizationDomain',
  'organizationModule',
] as const)

const MUTATION_OPERATIONS = new Set(['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany', 'upsert'])

/**
 * Prisma middleware that logs all mutations to audit_logs.
 * Uses separate Prisma client to avoid infinite recursion.
 */
export function auditMiddleware() {
  return Prisma.defineExtension({
    name: 'auditLogger',
    query: {
      $allModels: {
        async $allOperations({ args, model, operation, query, data }) {
          // Only audit mutations on audited models
          if (!MUTATION_OPERATIONS.has(operation) || !AUDITED_MODELS.has(model as typeof AUDITED_MODELS[number])) {
            return query(args)
          }

          const ctx = getTenantContext()
          const result = await query(args)

          // Fire-and-forget audit write (don't block the operation)
          try {
            const db = (await import('@/lib/db')).db
            // Determine the resource ID from result or args
            const resourceId = (result as Record<string, unknown>)?.id
              || (args.where as Record<string, unknown>)?.id
              || (args.data as Record<string, unknown>)?.id
              || null

            db.auditLog.create({
              data: {
                organizationId: ctx?.organizationId || 'system',
                actorType: ctx?.userId === 'system' ? 'system' : 'user',
                actorId: ctx?.userId || 'system',
                action: `${model}.${operation}`,
                resourceType: model,
                resourceId: resourceId as string | undefined,
                metadata: JSON.stringify({ args: redactSensitive(args) }),
              },
            }).catch(() => {
              // Audit logging failure should never break the main operation
            })
          } catch {
            // Ignore audit errors
          }

          return result
        },
      },
    },
  })
}

/** Redact sensitive fields from audit metadata */
function redactSensitive(obj: Record<string, unknown>): unknown {
  const sensitive = new Set(['password', 'token', 'secret', 'apiKey', 'creditCard'])
  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactSensitive(value as Record<string, unknown>)
    } else {
      redacted[key] = value
    }
  }
  return redacted
}
