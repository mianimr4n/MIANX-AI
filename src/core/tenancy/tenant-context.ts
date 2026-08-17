// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Tenant Context Resolution
// Application-level tenant isolation (defense in depth with RLS in production)
// ══════════════════════════════════════════════════════════════════

import { AsyncLocalStorage } from 'async_hooks'

export interface TenantContext {
  organizationId: string
  userId: string
  membershipId?: string
  roles: string[]
  requestId?: string
}

const tenantStore = new AsyncLocalStorage<TenantContext>()

/**
 * Run a function within a tenant context.
 * All database queries inside the callback will be automatically
 * scoped to this organization.
 */
export function withTenant<T>(
  ctx: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantStore.run(ctx, fn)
}

/** Get the current tenant context (null if not set) */
export function getTenantContext(): TenantContext | null {
  return tenantStore.getStore() ?? null
}

/** Get the current tenant context or throw */
export function requireTenantContext(): TenantContext {
  const ctx = getTenantContext()
  if (!ctx) {
    throw new TenantContextError('No tenant context found. Wrap the operation with withTenant().')
  }
  return ctx
}

/** Check if user has active access to the given organization */
export async function userHasOrgAccess(
  organizationId: string,
  userId: string,
  db: { organizationMembership: { findFirst: (args: Record<string, unknown>) => Promise<unknown> } }
): Promise<boolean> {
  const membership = await db.organizationMembership.findFirst({
    where: {
      organizationId,
      userId,
      status: 'active',
    },
  })
  return membership !== null
}

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantContextError'
  }
}

/**
 * Create a tenant context for the system (no user, used for background jobs)
 */
export function systemContext(organizationId: string): TenantContext {
  return {
    organizationId,
    userId: 'system',
    roles: ['system'],
  }
}
