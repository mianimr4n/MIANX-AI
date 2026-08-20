// ══════════════════════════════════════════════════════
// MIANX.AI — API Authorization Middleware
// Higher-order function to wrap API route handlers with auth + RBAC
// Fail-closed: any missing auth info = automatic denial
// Phase 11: requestId propagation, production-safe error responses
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentUser, resolveAuthContext, resolveDevAuthContext, AuthenticationError, AuthorizationError } from './auth-context'
import type { AuthContext } from './auth-context'
export type { AuthContext }
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

/** Phase 11: Generate or propagate a request ID */
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') ||
    (typeof crypto !== 'undefined' && crypto.randomUUID?.() ? crypto.randomUUID() :
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
}

/** Phase 11: Check rate limits (in-memory, per IP+endpoint) */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(request: NextRequest, maxRequests: number, windowMs: number): boolean {
  // Skip rate limiting in development
  if (process.env.NODE_ENV !== 'production') return true

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const path = new URL(request.url).pathname
  const key = `${ip}:${path}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

// Periodic cleanup of stale rate limit entries
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) rateLimitStore.delete(key)
    }
  }, 60000).unref()
}

async function resolveAndAuthorize(request: NextRequest, options: WithAuthOptions): Promise<AuthContext | NextResponse> {
  const requestId = getRequestId(request)

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
    // Phase 11: Dev mode bypass NEVER active in production
    if (options.allowDev !== false && process.env.NODE_ENV !== 'production') {
      const devCtx = await resolveDevAuthContext(request)
      if (!devCtx) {
        return NextResponse.json(
          { error: 'No active membership found. Pass X-Dev-User-Id and X-Dev-Org-Id headers.', requestId },
          { status: 401, headers: { 'X-Request-Id': requestId } }
        )
      }
      return resolveAuthContext(devCtx.userId, devCtx.organizationId)
    }
    return NextResponse.json(
      { error: 'Authentication required', requestId },
      { status: 401, headers: { 'X-Request-Id': requestId } }
    )
  }

  // 2. Determine org from header (NEVER from body/query — defense in depth)
  const orgId = request.headers.get('x-organization-id') || request.headers.get('x-dev-org-id')
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization context required. Pass X-Organization-Id header.', requestId },
      { status: 400, headers: { 'X-Request-Id': requestId } }
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

/** Phase 11: Safe error response — never leaks stack traces */
function safeError(request: NextRequest, error: unknown): NextResponse {
  const requestId = getRequestId(request)
  const isProd = process.env.NODE_ENV === 'production'

  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: error.message, requestId }, { status: error.statusCode, headers: { 'X-Request-Id': requestId } })
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message, requestId }, { status: error.statusCode, headers: { 'X-Request-Id': requestId } })
  }

  // Phase 11: Log the full error server-side, return safe message to client
  console.error('[Auth middleware error]', error)
  return NextResponse.json(
    {
      error: 'Internal authorization error',
      requestId,
      ...(isProd ? {} : { detail: error instanceof Error ? error.message : 'Unknown error' }),
    },
    { status: 500, headers: { 'X-Request-Id': requestId } }
  )
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
      return safeError(request, error)
    }
  }
}

/**
 * Wrap an API route handler WITH dynamic params (e.g., /api/teams/[id]).
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
      return safeError(request, error)
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

/** Phase 11: Rate-limited version — apply rate limit before auth */
export function withRateLimit(
  maxRequests: number,
  windowMs: number
) {
  return <T extends AuthenticatedHandler | AuthenticatedHandlerWithParams>(handler: T): T => {
    return (async (request: NextRequest, ...args: unknown[]) => {
      if (!checkRateLimit(request, maxRequests, windowMs)) {
        const requestId = getRequestId(request)
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.', requestId },
          { status: 429, headers: { 'X-Request-Id': requestId, 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
        )
      }
      return (handler as (req: NextRequest, ...a: unknown[]) => Promise<NextResponse>)(request, ...args)
    }) as unknown as T
  }
}
