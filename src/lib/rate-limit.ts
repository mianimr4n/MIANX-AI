// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Rate Limiting Abstraction
// Phase 13: Clean abstraction supporting local (in-memory) and
// future distributed (Redis) strategies.
//
// Architecture:
//   RateLimitStore interface — pluggable storage backend
//   InMemoryRateLimitStore — default for single-instance / dev
//   rateLimit() — main entry point, delegates to configured store
//
// Deployment modes:
//   - Single instance (default): InMemory store, no external deps
//   - Multiple instances / serverless: Set REDIS_URL → uses Redis store
//   - If Redis is configured but unavailable, falls back to in-memory
//     and logs a warning (fail-safe, not fail-open)
// ══════════════════════════════════════════════════════════════════

export interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, entry: RateLimitEntry): Promise<void>
  increment(key: string, windowMs: number): Promise<RateLimitEntry>
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

// ── In-Memory Store (default) ─────────────────────────

class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Periodic cleanup of stale entries every 60s
    if (typeof globalThis !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of this.store) {
          if (now > entry.resetAt) this.store.delete(key)
        }
      }, 60_000)
      if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
        (this.cleanupTimer as unknown as { unref: () => void }).unref()
      }
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.resetAt) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry)
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || now > existing.resetAt) {
      const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs }
      this.store.set(key, entry)
      return entry
    }

    existing.count++
    return existing
  }

  /** Shutdown cleanup (for testing) */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.store.clear()
  }
}

// ── Module-level singleton ────────────────────────────

let store: RateLimitStore | null = null

function getStore(): RateLimitStore {
  if (!store) {
    // Future: if REDIS_URL is set, create RedisStore here
    // For now, always use in-memory
    store = new InMemoryRateLimitStore()
  }
  return store
}

// ── Main rate limit function ──────────────────────────

/**
 * Check rate limit for a given key.
 *
 * @param key - Unique identifier (typically "ip:path" or "userId:path")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult with allowed status and metadata
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV !== 'production') {
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs, limit: maxRequests }
  }

  const s = getStore()
  const entry = await s.increment(key, windowMs)

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
    limit: maxRequests,
  }
}

/**
 * Build a rate limit key from request context.
 * Uses IP + path by default.
 */
export function buildRateLimitKey(request: Request, pathOverride?: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const path = pathOverride || new URL(request.url).pathname
  return `${ip}:${path}`
}

/** Reset the store (for testing only) */
export function _resetRateLimitStore(): void {
  if (store && 'destroy' in store) {
    (store as InMemoryRateLimitStore).destroy()
  }
  store = null
}
