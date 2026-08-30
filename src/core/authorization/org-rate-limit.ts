import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, buildOrgRateLimitKey } from '@/lib/rate-limit'
import { withAuth, type AuthContext, type AuthenticatedHandler, type WithAuthOptions } from './middleware'

/**
 * Rate-limit an authenticated route using organization + client identity.
 * Authentication runs first, so a tenant can never influence another
 * tenant's rate-limit bucket.
 */
export function withOrgRateLimit(
  maxRequests: number,
  windowMs: number,
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {},
): (request: NextRequest) => Promise<NextResponse> {
  return withAuth(async (request: NextRequest, ctx: AuthContext) => {
    const key = buildOrgRateLimitKey(request, ctx.organizationId)
    const result = await rateLimit(key, maxRequests, windowMs)

    if (!result.allowed) {
      const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', requestId },
        {
          status: 429,
          headers: {
            'X-Request-Id': requestId,
            'Retry-After': String(Math.ceil(windowMs / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          },
        },
      )
    }

    return handler(request, ctx)
  }, options)
}
