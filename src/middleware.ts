// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Next.js Root Middleware
// Security headers, CORS, CSP, request ID propagation
// Phase 13: Added Content-Security-Policy
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Frame-Options': 'DENY',
}

// Add HSTS only in production HTTPS
if (process.env.NODE_ENV === 'production') {
  SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
}

// ── CSP Policy ─────────────────────────────────────────
// Phase 13: Production-safe Content Security Policy
//
// Directives and rationale:
//   default-src 'self'           — baseline deny-all
//   script-src  'self' 'unsafe-inline' (dev: + 'unsafe-eval')
//     → 'unsafe-inline' required: Next.js injects inline scripts for
//       hydration, route prefetching, and RSC payload delivery.
//       These scripts carry nonces in dev but not reliably in all
//       standalone/prod configurations.
//     → 'unsafe-eval' in dev only: Next.js HMR uses eval for hot module
//       replacement. Not required in production — verified that
//       react-syntax-highlighter, prismjs, and refractor do NOT use
//       eval or new Function() in their runtime paths.
//   style-src 'self' 'unsafe-inline'
//     → Required: Tailwind CSS v4 emits runtime styles via inline
//       <style> tags. Emotion/styled-components also use inline styles.
//   img-src 'self' data: blob: https:
//     → 'self': static assets
//     → 'data:': small inline images (SVGs in code, placeholders)
//     → 'blob:': object URLs used by file uploads, canvas operations
//     → 'https:': external images (user avatars, integrations, AI content)
//   font-src 'self' https: data:
//     → 'self': bundled fonts
//     → 'https:': Google Fonts (Geist Sans/Mono loaded via next/font/google)
//     → 'data:': some font loaders embed base64 font subsets
//   connect-src 'self' https: wss: http://localhost:*
//     → 'self': same-origin API calls
//     → 'https:': external API calls (AI providers, integrations)
//     → 'wss:': WebSocket connections for AI streaming, real-time features
//     → 'http://localhost:*': dev-mode API calls (HMR, Supabase local)
//   frame-ancestors 'none'
//     → Replaces X-Frame-Options: DENY with CSP equivalent
//   base-uri 'self'
//     → Prevent <base> tag injection attacks
//   form-action 'self'
//     → Restrict form submissions to same origin
//   object-src 'none'
//     → Block Flash, Java applets, etc.

function buildCSP(isDev: boolean): string {
  const parts = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' https: data:`,
    `connect-src 'self' https: wss:${isDev ? ' http://localhost:*' : ''}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ]
  return parts.join('; ')
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const requestId = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const isDev = process.env.NODE_ENV !== 'production'
  const { pathname } = request.nextUrl

  // 1. Security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  // 2. Content Security Policy (page routes only, not API)
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
    response.headers.set('Content-Security-Policy', buildCSP(isDev))
  }

  // 3. Request ID propagation
  response.headers.set('X-Request-Id', requestId)

  // 4. CORS handling
  const origin = request.headers.get('origin')
  if (origin) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const allowed = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : [appUrl]
    if (allowed.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
      const devHeaders = isDev
        ? ', X-Dev-User-Id, X-Dev-Org-Id'
        : ''
      response.headers.set('Access-Control-Allow-Headers', `Content-Type, Authorization, X-Organization-Id${devHeaders}, X-Request-Id`)
      response.headers.set('Access-Control-Max-Age', '86400')
    }
  }

  // 5. Block requests to API routes without organization header (except health/public/bootstrap)
  // Phase 18: /api/organizations must be exempt — users need to list organizations
  //   before they can select one (bootstrap / chicken-and-egg).
  //   /api/me is exempt — user profile is not org-scoped.
  const ORG_EXEMPT_PREFIXES = [
    '/api/health',
    '/api/observability/health',
    '/api/version',
    '/api/domains',
    '/api/organizations',
    '/api/me',
    '/api/permissions',
    '/api/admin',
    '/api/command-center',
  ]
  const isOrgExempt = ORG_EXEMPT_PREFIXES.some(p => pathname.startsWith(p)) || pathname === '/api/route'

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health') && !pathname.startsWith('/api/observability/health')) {
    // Allow OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return response
    }
    // Ensure X-Organization-Id is present for API routes
    const orgId = request.headers.get('x-organization-id') || (isDev ? request.headers.get('x-dev-org-id') : null)
    if (!orgId && !isDev && !isOrgExempt) {
      return NextResponse.json({ error: 'X-Organization-Id header required', requestId }, { status: 400 })
    }
  }

  // 6. Server-side page route protection
  // Protected routes require a Supabase auth session cookie.
  // Supabase SSR stores session in cookies matching: sb-<project-ref>-auth-token
  // In development without Supabase, the dev bypass headers are accepted.
  const PROTECTED_PREFIXES = ['/app', '/admin', '/onboarding']
  const isProtectedRoute = PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (isProtectedRoute && !isDev) {
    const cookies = request.cookies
    let hasAuthCookie = false
    // Check for any Supabase auth token cookie (sb-xxx-auth-token)
    for (const [name] of cookies) {
      if (name.endsWith('-auth-token')) {
        hasAuthCookie = true
        break
      }
    }
    if (!hasAuthCookie) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const runtime = 'nodejs'

export const config = {
  matcher: [
    // Match all API routes and pages
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)',
  ],
}