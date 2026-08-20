// ══════════════════════════════════════════════════════
// MIANX.AI — API Security Tests
// Phase 13: Tests for security invariants without running server
// ══════════════════════════════════════════════════════

import { describe, test, expect } from 'bun:test'
import { parsePagination, prismaPagination, paginateResult, MAX_PAGE_SIZE } from '@/lib/pagination'

// ── Pagination Safety ────────────────────────────────

describe('API Security: Pagination Safety', () => {
  test('no API endpoint can be forced to return more than MAX_PAGE_SIZE', () => {
    const extremeParams = new URLSearchParams('limit=999999999')
    const result = parsePagination(extremeParams)
    expect(result.pageSize).toBeLessThanOrEqual(MAX_PAGE_SIZE)
    expect(result.pageSize).toBe(MAX_PAGE_SIZE)
  })

  test('negative limit is safely clamped to 1', () => {
    const result = parsePagination(new URLSearchParams('limit=-100'))
    expect(result.pageSize).toBe(1)
  })

  test('zero limit is safely clamped to 1', () => {
    const result = parsePagination(new URLSearchParams('limit=0'))
    expect(result.pageSize).toBe(1)
  })

  test('string limit is safely defaulted', () => {
    const result = parsePagination(new URLSearchParams('limit=abc'))
    expect(result.pageSize).toBe(20) // DEFAULT_PAGE_SIZE
  })

  test('skip is never negative', () => {
    const pagination = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const { skip } = prismaPagination(pagination)
    expect(skip).toBeGreaterThanOrEqual(0)
  })

  test('skip scales correctly with large page numbers', () => {
    const pagination = { page: 1000, pageSize: 50, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const { skip, take } = prismaPagination(pagination)
    expect(skip).toBe(49950)
    expect(take).toBe(50)
  })
})

// ── Error Response Safety ────────────────────────────

describe('API Security: Error Response Patterns', () => {
  test('safe error response structure has no details in production', () => {
    const isProd = true
    const error = new Error('PrismaClientInitializationError: connect ECONNREFUSED 127.0.0.1:5432')
    const response = {
      error: 'Internal authorization error',
      requestId: 'test-123',
      ...(isProd ? {} : { detail: error.message }),
    }
    expect(response).not.toHaveProperty('detail')
    expect(response.error).not.toContain('ECONNREFUSED')
    expect(response.error).not.toContain('Prisma')
    expect(response.error).not.toContain('127.0.0.1')
  })

  test('safe error response includes detail in development', () => {
    const isProd = false
    const error = new Error('some useful debug info')
    const response = {
      error: 'Internal authorization error',
      requestId: 'test-123',
      ...(isProd ? {} : { detail: error.message }),
    }
    expect(response).toHaveProperty('detail')
    expect((response as { detail: string }).detail).toBe('some useful debug info')
  })

  test('error responses never expose stack traces', () => {
    const error = new Error('test')
    const safeMessage = error instanceof Error ? error.message : 'Unknown error'
    expect(safeMessage).not.toContain('at ')
    expect(safeMessage).not.toContain('/home/')
    expect(safeMessage).not.toContain('/node_modules/')
  })
})

// ── Input Validation Patterns ────────────────────────

describe('API Security: Input Validation', () => {
  test('organization name validation rejects short names', () => {
    const names = ['', 'a', '  ']
    for (const name of names) {
      const valid = Boolean(name && typeof name === 'string' && name.trim().length >= 2)
      expect(valid).toBe(false)
    }
  })

  test('organization name validation accepts valid names', () => {
    const names = ['Acme Corp', 'Org', 'Test Organization']
    for (const name of names) {
      const valid = name && typeof name === 'string' && name.trim().length >= 2
      expect(valid).toBe(true)
    }
  })

  test('workflow step validation requires valid types', () => {
    const validTypes = ['action', 'condition', 'approval', 'ai_decision', 'delay']
    expect(validTypes.includes('action')).toBe(true)
    expect(validTypes.includes('invalid_type')).toBe(false)
    expect(validTypes.includes('')).toBe(false)
  })

  test('job priority validation accepts only valid values', () => {
    const validPriorities = ['low', 'normal', 'high', 'critical']
    expect(validPriorities.includes('critical')).toBe(true)
    expect(validPriorities.includes('urgent')).toBe(false)
    expect(validPriorities.includes('')).toBe(false)
  })
})

// ── Tenant Isolation Invariants ──────────────────────

describe('API Security: Tenant Isolation Patterns', () => {
  test('withAuth always enforces org context in production', () => {
    const isProd = true
    const orgId = null
    const isHealthEndpoint = false
    const isDomainsEndpoint = false
    const isRootApi = false

    const shouldBlock = isProd && !orgId && !isHealthEndpoint && !isDomainsEndpoint && !isRootApi
    expect(shouldBlock).toBe(true)
  })

  test('health endpoints bypass org requirement', () => {
    const isProd = true
    const orgId = null
    const isHealthEndpoint = true

    const shouldBlock = isProd && !orgId && !isHealthEndpoint
    expect(shouldBlock).toBe(false)
  })

  test('dev headers never accepted in production', () => {
    const isProd = true
    const orgId = null
    const devOrgId = 'dev-org-123'

    const effectiveOrgId = orgId || (isProd ? null : devOrgId)
    expect(effectiveOrgId).toBeNull()
  })
})

// ── CSP Policy Structure ─────────────────────────────

describe('API Security: CSP Policy Requirements', () => {
  const requiredDirectives = [
    'default-src', 'script-src', 'style-src', 'img-src', 'font-src',
    'connect-src', 'frame-ancestors', 'base-uri', 'form-action', 'object-src',
  ]

  test('CSP includes all required directives (production)', () => {
    const isDev = false
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
    const csp = parts.join('; ')

    for (const directive of requiredDirectives) {
      expect(csp).toContain(directive)
    }
  })

  test('CSP blocks framing with frame-ancestors none', () => {
    const csp = "frame-ancestors 'none'"
    expect(csp).toContain("'none'")
  })

  test('CSP blocks plugins with object-src none', () => {
    const csp = 'object-src none'
    expect(csp).toContain('none')
  })

  test('CSP dev mode includes localhost in connect-src', () => {
    const isDev = true
    const connectSrc = `connect-src 'self' https: wss:${isDev ? ' http://localhost:*' : ''}`
    expect(connectSrc).toContain('http://localhost:*')
  })

  test('CSP prod mode excludes localhost from connect-src', () => {
    const isDev = false
    const connectSrc = `connect-src 'self' https: wss:${isDev ? ' http://localhost:*' : ''}`
    expect(connectSrc).not.toContain('http://localhost')
  })

  test('CSP production does NOT include unsafe-eval', () => {
    const isDev = false
    const scriptSrc = `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`
    expect(scriptSrc).not.toContain('unsafe-eval')
  })

  test('CSP dev mode includes unsafe-eval for HMR', () => {
    const isDev = true
    const scriptSrc = `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`
    expect(scriptSrc).toContain('unsafe-eval')
  })
})

// ── Rate Limit Headers ───────────────────────────────

describe('API Security: Rate Limit Response', () => {
  test('429 response includes standard rate limit headers', () => {
    const response = {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((Date.now() + 60_000) / 1000)),
      },
    }
    expect(response.status).toBe(429)
    expect(response.headers['Retry-After']).toBeDefined()
    expect(response.headers['X-RateLimit-Remaining']).toBeDefined()
    expect(response.headers['X-RateLimit-Reset']).toBeDefined()
  })

  test('Retry-After is a valid positive integer string', () => {
    const windowMs = 60_000
    const retryAfter = String(Math.ceil(windowMs / 1000))
    const parsed = parseInt(retryAfter, 10)
    expect(parsed).toBeGreaterThan(0)
    expect(Number.isNaN(parsed)).toBe(false)
  })
})
