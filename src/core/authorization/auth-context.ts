// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Authentication Context Resolution
// Resolves Supabase user → org membership → roles → permissions
// Works with dev stubs when Supabase is not configured
// ══════════════════════════════════════════════════════════════════

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export interface AuthUser {
  id: string
  email?: string | null
}

export interface AuthContext {
  user: AuthUser
  organizationId: string
  membershipId: string
  roles: AuthRole[]
  permissions: string[]
}

export interface AuthRole {
  id: string
  name: string
  slug: string
  isSystem: boolean
}

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode = 401) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public statusCode = 403) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Resolve the current user from Supabase session.
 * In dev mode (no Supabase), returns the dev stub user ONLY in development.
 * Phase 11: Production ALWAYS requires real authentication.
 */
export async function resolveCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    // Phase 11: Dev mode stub ONLY in development environment
    if (process.env.NODE_ENV === 'production') {
      return null // No Supabase in production = auth failure
    }
    return { id: 'user-admin-001', email: 'dev@mianx.ai' }
  }

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  return { id: user.id, email: user.email }
}

/**
 * Resolve the full auth context for a user within an organization.
 * This is the main entry point for authorization.
 *
 * Chain: User → Active Membership → Roles → Permissions
 */
export async function resolveAuthContext(
  userId: string,
  organizationId: string
): Promise<AuthContext> {
  // 1. Verify active membership
  const membership = await db.organizationMembership.findFirst({
    where: {
      organizationId,
      userId,
      status: 'active',
    },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  })

  if (!membership) {
    throw new AuthorizationError(
      'No active membership found for this organization',
      403
    )
  }

  // 2. Extract roles and permissions
  const roles: AuthRole[] = membership.roles.map(mr => ({
    id: mr.role.id,
    name: mr.role.name,
    slug: mr.role.slug,
    isSystem: mr.role.isSystem,
  }))

  // Flatten all permissions from all roles (deduplicated)
  const permissionSet = new Set<string>()
  for (const mr of membership.roles) {
    for (const rp of mr.role.permissions) {
      permissionSet.add(rp.permission.key)
    }
  }

  // Owners always get all permissions (fail-open for owners)
  const hasOwnerRole = roles.some(r => r.slug === 'owner')
  if (hasOwnerRole) {
    const allPerms = await db.permission.findMany({ select: { key: true } })
    allPerms.forEach(p => permissionSet.add(p.key))
  }

  return {
    user: { id: userId },
    organizationId,
    membershipId: membership.id,
    roles,
    permissions: Array.from(permissionSet),
  }
}

/**
 * Resolve auth context for dev mode (bypasses Supabase).
 * Uses X-Dev-User-Id and X-Dev-Org-Id headers.
 */
export async function resolveDevAuthContext(
  request: Request
): Promise<{ userId: string; organizationId: string } | null> {
  const userId = request.headers.get('x-dev-user-id')
  const orgId = request.headers.get('x-dev-org-id')

  if (userId && orgId) return { userId, organizationId: orgId }

  // Default: use first active membership of the dev user
  const membership = await db.organizationMembership.findFirst({
    where: { userId: 'user-admin-001', status: 'active' },
  })

  if (!membership) return null

  return {
    userId: membership.userId,
    organizationId: membership.organizationId,
  }
}

/**
 * Get all organizations a user has access to.
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await db.organizationMembership.findMany({
    where: { userId, status: 'active' },
    include: {
      organization: {
        include: {
          _count: { select: { memberships: true, teams: true } },
        },
      },
      roles: {
        include: { role: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return memberships.map(m => ({
    id: m.id,
    organization: m.organization,
    roles: m.roles.map(mr => mr.role),
    joinedAt: m.joinedAt,
  }))
}
