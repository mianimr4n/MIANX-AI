// ══════════════════════════════════════════════════════
// MIANX.AI — Production Preflight Validator
// Phase 15: Fail-closed checks before serving traffic
// ══════════════════════════════════════════════════════

interface PreflightCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  variable?: string  // only the variable NAME, never the value
}

export interface PreflightResult {
  ready: boolean
  checks: PreflightCheck[]
  timestamp: string
}

/**
 * Run production preflight checks.
 * NEVER prints secret values — only variable names and status.
 * In non-production environments, returns ready=true with info checks.
 */
export function runPreflight(): PreflightResult {
  const checks: PreflightCheck[] = []
  const isProd = process.env.NODE_ENV === 'production'

  // ── NODE_ENV ────────────────────────────────────────────────
  checks.push({
    name: 'NODE_ENV',
    status: isProd ? 'pass' : 'warn',
    message: isProd ? 'production' : `non-production (${process.env.NODE_ENV || 'not set'})`,
    variable: 'NODE_ENV',
  })

  // ── DATABASE_URL ────────────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    checks.push({
      name: 'DATABASE_URL',
      status: 'fail',
      message: 'DATABASE_URL is not set',
      variable: 'DATABASE_URL',
    })
  } else if (isProd && !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    checks.push({
      name: 'DATABASE_URL',
      status: 'fail',
      message: 'Production requires PostgreSQL (postgresql:// or postgres:// prefix)',
      variable: 'DATABASE_URL',
    })
  } else {
    const dbType = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')
      ? 'PostgreSQL'
      : dbUrl.startsWith('file:')
        ? 'SQLite (dev only)'
        : 'unknown'
    checks.push({
      name: 'DATABASE_URL',
      status: isProd ? 'pass' : (dbUrl.startsWith('file:') ? 'pass' : 'warn'),
      message: `present (${dbType})`,
      variable: 'DATABASE_URL',
    })
  }

  // ── Supabase Auth (production required) ──────────────────────
  if (isProd) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnon || !supabaseService) {
      checks.push({
        name: 'Supabase Auth',
        status: 'fail',
        message: 'Production requires all three: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY',
        variable: 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY',
      })
    } else {
      checks.push({
        name: 'Supabase Auth',
        status: 'pass',
        message: 'all three keys present',
        variable: 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY',
      })
    }
  } else {
    checks.push({
      name: 'Supabase Auth',
      status: 'warn',
      message: 'optional in development',
      variable: 'NEXT_PUBLIC_SUPABASE_URL',
    })
  }

  // ── AI Provider (at least one recommended) ────────────────────
  const hasOpenai = !!process.env.OPENAI_API_KEY
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
  const aiCount = [hasOpenai, hasAnthropic, hasGoogle].filter(Boolean).length

  checks.push({
    name: 'AI Providers',
    status: isProd ? (aiCount > 0 ? 'pass' : 'warn') : 'warn',
    message: aiCount > 0
      ? `${aiCount} provider(s) configured`
      : 'no AI providers configured (AI features will be unavailable)',
    variable: 'OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY',
  })

  // ── Redis (optional) ─────────────────────────────────────────
  const hasRedis = !!process.env.REDIS_URL
  checks.push({
    name: 'Redis Rate Limiting',
    status: 'pass',  // always pass — fallback to in-memory
    message: hasRedis ? 'distributed rate limiting enabled' : 'in-memory rate limiting (single instance)',
    variable: 'REDIS_URL',
  })

  // ── ALLOWED_ORIGINS (production recommended) ──────────────────
  if (isProd && !process.env.ALLOWED_ORIGINS) {
    checks.push({
      name: 'ALLOWED_ORIGINS',
      status: 'warn',
      message: 'not set — CORS will use default (may be too permissive)',
      variable: 'ALLOWED_ORIGINS',
    })
  } else if (process.env.ALLOWED_ORIGINS) {
    checks.push({
      name: 'ALLOWED_ORIGINS',
      status: 'pass',
      message: 'set',
      variable: 'ALLOWED_ORIGINS',
    })
  }

  const hasFailure = checks.some(c => c.status === 'fail')

  return {
    ready: !hasFailure,
    checks,
    timestamp: new Date().toISOString(),
  }
}
