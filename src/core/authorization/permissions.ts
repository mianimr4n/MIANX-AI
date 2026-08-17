// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Permission System
// Granular permission checks: domain.resource.action
// Fail-closed: missing authorization = automatic denial
// ══════════════════════════════════════════════════════════════════

import { parsePermission } from '@/core/tenancy/utils'
import type { AuthContext } from './auth-context'
import { AuthorizationError } from './auth-context'

/**
 * Check if a user has a specific permission.
 * Supports wildcard matching:
 *   - 'organization.*' matches 'organization.view', 'organization.update', etc.
 *   - '*.view' matches 'organization.view', 'team.view', etc.
 *   - '*.*' matches everything
 */
export function hasPermission(
  ctx: AuthContext,
  permissionKey: string
): boolean {
  const required = parsePermission(permissionKey)
  if (!required) return false

  // Owner always has access (defense in depth)
  if (ctx.roles.some(r => r.slug === 'owner')) return true

  return ctx.permissions.some(p => {
    const parsed = parsePermission(p)
    if (!parsed) return false

    // Exact match
    if (p === permissionKey) return true

    // Wildcard domain: 'organization.*'
    if (parsed.domain === '*' && parsed.resource === '*') return true
    if (parsed.domain === '*' && parsed.resource === required.resource && parsed.action === required.action) return true
    if (parsed.domain === required.domain && parsed.resource === '*' && parsed.action === required.action) return true
    if (parsed.domain === required.domain && parsed.resource === required.resource && parsed.action === '*') return true

    return false
  })
}

/**
 * Check if user has ANY of the given permissions (OR logic).
 */
export function hasAnyPermission(ctx: AuthContext, keys: string[]): boolean {
  return keys.some(k => hasPermission(ctx, k))
}

/**
 * Check if user has ALL of the given permissions (AND logic).
 */
export function hasAllPermissions(ctx: AuthContext, keys: string[]): boolean {
  return keys.every(k => hasPermission(ctx, k))
}

/**
 * Require a permission or throw 403.
 */
export function requirePermission(ctx: AuthContext, permissionKey: string): void {
  if (!hasPermission(ctx, permissionKey)) {
    throw new AuthorizationError(
      `Permission denied: '${permissionKey}' is required`,
      403
    )
  }
}

/**
 * Require any of the given permissions or throw 403.
 */
export function requireAnyPermission(ctx: AuthContext, keys: string[]): void {
  if (!hasAnyPermission(ctx, keys)) {
    throw new AuthorizationError(
      `Permission denied: requires one of [${keys.join(', ')}]`,
      403
    )
  }
}

/**
 * Check if user has a specific role.
 */
export function hasRole(ctx: AuthContext, roleSlug: string): boolean {
  return ctx.roles.some(r => r.slug === roleSlug)
}

/**
 * Require a specific role or throw 403.
 */
export function requireRole(ctx: AuthContext, roleSlug: string): void {
  if (!hasRole(ctx, roleSlug)) {
    throw new AuthorizationError(
      `Role required: '${roleSlug}'`,
      403
    )
  }
}

/**
 * Require owner or admin role.
 */
export function requireAdmin(ctx: AuthContext): void {
  if (!hasAnyRole(ctx, ['owner', 'admin'])) {
    throw new AuthorizationError(
      'Admin or Owner role required',
      403
    )
  }
}

/**
 * Check if user has any of the given roles.
 */
export function hasAnyRole(ctx: AuthContext, slugs: string[]): boolean {
  return slugs.some(s => hasRole(ctx, s))
}

/**
 * Filter a permission list to only those the user possesses.
 */
export function filterPermissions(ctx: AuthContext, keys: string[]): string[] {
  return keys.filter(k => hasPermission(ctx, k))
}
