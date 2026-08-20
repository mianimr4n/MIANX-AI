import { z } from 'zod'

// ══════════════════════════════════════════════════════
// MIANX.AI — Environment Configuration
// Phase 11: Centralized validation with production safety
// ══════════════════════════════════════════════════════

const envSchema = z.object({
  // Database — ALWAYS required
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),

  // Supabase (required for production auth, optional for dev)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // AI Providers (at least one recommended for AI features)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),

  // Phase 11: Production settings
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  // Phase 11: AI safety limits
  AI_DAILY_TOKEN_LIMIT: z.coerce.number().int().min(1000).max(10000000).optional(),
  AI_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(10).max(10000).optional(),

  // Phase 15: Redis (optional — distributed rate limiting)
  REDIS_URL: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null
let _validated = false

/**
 * Parse environment variables. Returns null if invalid (soft fail for dev).
 * Phase 11: In production, invalid config causes startup failure.
 */
export function getEnv(): Env | null {
  if (_env) return _env

  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    AI_DAILY_TOKEN_LIMIT: process.env.AI_DAILY_TOKEN_LIMIT,
    AI_DAILY_REQUEST_LIMIT: process.env.AI_DAILY_REQUEST_LIMIT,
    REDIS_URL: process.env.REDIS_URL,
  })

  if (!result.success) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[ENV] Fatal: Invalid environment configuration:', result.error.flatten().fieldErrors)
      return null
    }
    // Dev mode: log warnings but don't block
    console.warn('[ENV] Configuration issues (non-fatal in dev):', result.error.flatten().fieldErrors)
    _env = result.data as unknown as Env
    return _env
  }

  _env = result.data
  _validated = true
  return _env
}

/** Require valid environment — throws if invalid (use at startup) */
export function requireEnv(): Env {
  const env = getEnv()
  if (!env) {
    throw new Error(
      'MIANX.AI: Invalid or missing environment configuration. ' +
      'Check .env.local against .env.example. ' +
      'DATABASE_URL is required.'
    )
  }
  return env
}

/** Check if environment has been validated successfully */
export function isEnvValid(): boolean {
  return _validated
}