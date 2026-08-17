// ══════════════════════════════════════════════════════════════════
// MIANX.AI — API Authorization Middleware
// Higher-order function to wrap API route handlers with auth + RBAC
// Fail-closed: any missing auth info = automatic denial
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentUser, resolveAuthContext, resolveDevAuthContext, AuthenticationError, AuthorizationError, type AuthContext } from './auth-context'
import { requirePermission, requireAnyPermission, requireAdmin, requireRole } from './permissions'
import { withTenant } from '@/core/tenancy'

/** Handler for routes WITHOUT dynamic params (e.g., /api/teams) */
export type AuthenticatedHandler = (
  request: NextRequest,
  ctx: AuthContext
) => Promise<NextResponse>

/** Handler for routes WITH dynamic params (e.g., /api/teams/[id]) */
export type AuthenticatedHandlerWithParams<T extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  ctx: AuthContext,
  params: T
) => Promise<NextResponse>

export interface WithAuthOptions {
  /** Specific permission required (e.g., 'organization.view') */
  permission?: string
  /** Any of these permissions required (OR logic) */
  anyPermission?: string[]
  /** Require owner or admin role */
  adminOnly?: boolean
  /** Require specific role */
  role?: string
  /** Allow dev mode (no Supabase) — defaults to true in dev */
  allowDev?: boolean
  /** Skip authentication entirely (system/internal endpoints) */
  skipAuth?: boolean
}

async function resolveAndAuthorize(request: NextRequest, options: WithAuthOptions): Promise<AuthContext | NextResponse> {
  // System/skip-auth mode
  if (options.skipAuth) {
    return {
      user: { id: 'system' },
      organizationId: '',
      membershipId: '',
      roles: [{ id: 'system', name: 'System', slug: 'system', isSystem: true }],
      permissions: ['*'],
    }
  }

  // 1. Resolve user
  const user = await resolveCurrentUser()
  if (!user) {
    if (options.allowDev !== false && process.env.NODE_ENV !== 'production') {
      const devCtx = await resolveDevAuthContext(request)
      if (!devCtx) {
        return NextResponse.json(
          { error: 'No active membership found. Pass X-Dev-User-Id and X-Dev-Org-Id headers.' },
          { status: 401 }
        )
      }
      return resolveAuthContext(devCtx.userId, devCtx.organizationId)
    }
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 2. Determine org from header (NEVER from body/query — defense in depth)
  const orgId = request.headers.get('x-organization-id') || request.headers.get('x-dev-org-id')
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization context required. Pass X-Organization-Id header.' },
      { status: 400 }
    )
  }

  // 3. Resolve full auth context
  const authCtx = await resolveAuthContext(user.id, orgId)

  // 4. Check authorization
  if (options.permission) requirePermission(authCtx, options.permission)
  if (options.anyPermission) requireAnyPermission(authCtx, options.anyPermission)
  if (options.adminOnly) requireAdmin(authCtx)
  if (options.role) requireRole(authCtx, options.role)

  return authCtx
}

/**
 * Wrap an API route handler (no dynamic params) with auth + RBAC.
 *
 * Usage:
 *   export const GET = withAuth(async (req, ctx) => {
 *     return NextResponse.json({ data: 'ok' })
 *   }, { permission: 'organization.view' })
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    try {
      const result = await resolveAndAuthorize(request, options)
      if (result instanceof NextResponse) return result

      const authCtx = result as AuthContext
      return withTenant(
        {
          organizationId: authCtx.organizationId,
          userId: authCtx.user.id,
          membershipId: authCtx.membershipId,
          roles: authCtx.roles.map(r => r.slug),
        },
        () => handler(request, authCtx)
      )
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      if (error instanceof AuthorizationError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      console.error('[Auth middleware error]', error)
      return NextResponse.json({ error: 'Internal authorization error' }, { status: 500 })
    }
  }
}

/**
 * Wrap an API route handler WITH dynamic params (e.g., /api/teams/[id]).
 *
 * Usage:
 *   export const GET = withAuthParams(async (req, ctx, { id }) => {
 *     return NextResponse.json({ data: { id } })
 *   }, { permission: 'team.view' })
 */
export function withAuthParams<T extends Record<string, string> = Record<string, string>>(
  handler: AuthenticatedHandlerWithParams<T>,
  options: WithAuthOptions = {}
): (request: NextRequest, context: { params: Promise<T> }) => Promise<NextResponse> {
  return async (request: NextRequest, context: { params: Promise<T> }) => {
    try {
      const result = await resolveAndAuthorize(request, options)
      if (result instanceof NextResponse) return result

      const authCtx = result as AuthContext
      const params = await context.params

      return withTenant(
        {
          organizationId: authCtx.organizationId,
          userId: authCtx.user.id,
          membershipId: authCtx.membershipId,
          roles: authCtx.roles.map(r => r.slug),
        },
        () => handler(request, authCtx, params)
      )
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      if (error instanceof AuthorizationError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      console.error('[Auth middleware error]', error)
      return NextResponse.json({ error: 'Internal authorization error' }, { status: 500 })
    }
  }
}

/**
 * Lightweight version: only resolves auth, no permission checks.
 */
export function withAuthContext(
  handler: AuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return withAuth(handler, {})
}
