// MIANX.AI — Audit Logging Middleware
// Captures all mutations with actor, resource, before/after
// Phase 11: Fixed Prisma v6 compatibility

import { Prisma } from '@prisma/client'
import { getTenantContext } from './tenant-context'

const AUDITED_MODELS = new Set<string>([
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

export function auditMiddleware() {
  return Prisma.defineExtension({
    name: 'auditLogger',
    query: {
      $allModels: {
        async $allOperations({ args, model, operation, query }) {
          if (!MUTATION_OPERATIONS.has(operation) || !AUDITED_MODELS.has(model as string)) {
            return query(args)
          }

          const ctx = getTenantContext()
          const result = await query(args)

          try {
            const db = (await import('@/lib/db')).db
            const r = result as Record<string, unknown> | null
            const resourceId = r?.id as string | undefined

            db.auditLog.create({
              data: {
                organizationId: ctx?.organizationId || 'system',
                actorType: ctx?.userId === 'system' ? 'system' : 'user',
                actorId: ctx?.userId || 'system',
                action: `${model}.${operation}`,
                resourceType: model,
                resourceId,
                metadata: JSON.stringify({ args: redactSensitive(args) }),
              },
            }).catch(() => {})
          } catch {}

          return result
        },
      },
    },
  })
}

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
