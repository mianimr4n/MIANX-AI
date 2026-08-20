// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Next.js Root Middleware
// Security headers, CORS, request ID propagation
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

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const requestId = crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  // 1. Security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  // 2. Request ID propagation
  response.headers.set('X-Request-Id', requestId)

  // 3. CORS handling
  const origin = request.headers.get('origin')
  if (origin) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const allowed = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : [appUrl]
    if (allowed.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Organization-Id, X-Dev-User-Id, X-Dev-Org-Id, X-Request-Id')
      response.headers.set('Access-Control-Max-Age', '86400')
    }
  }

  // 4. Block requests to API routes without organization header (except health/public)
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health') && !pathname.startsWith('/api/observability/health')) {
    // Allow OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return response
    }
    // Ensure X-Organization-Id is present for API routes
    const orgId = request.headers.get('x-organization-id') || request.headers.get('x-dev-org-id')
    if (!orgId && process.env.NODE_ENV === 'production') {
      // In production, require organization context
      if (!pathname.startsWith('/api/health') && !pathname.startsWith('/api/domains') && pathname !== '/api/route') {
        return NextResponse.json({ error: 'X-Organization-Id header required', requestId }, { status: 400 })
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all API routes and pages
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)',
  ],
}