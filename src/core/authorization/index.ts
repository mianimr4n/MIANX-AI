// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Authorization Module
// Re-exports for clean imports: import { withAuth, hasPermission } from '@/core/authorization'
// ══════════════════════════════════════════════════════════════════

export { withAuth, withAuthParams, withAuthContext, withRateLimit } from './middleware'
export type { WithAuthOptions, AuthenticatedHandler, AuthenticatedHandlerWithParams } from './middleware'
export { hasPermission, hasAnyPermission, hasAllPermissions, requirePermission, requireAnyPermission, requireRole, requireAdmin, hasRole, hasAnyRole, filterPermissions } from './permissions'
export { resolveCurrentUser, resolveAuthContext, resolveDevAuthContext, getUserOrganizations } from './auth-context'
export type { AuthUser, AuthContext, AuthRole } from './auth-context'
export { AuthenticationError, AuthorizationError } from './auth-context'
