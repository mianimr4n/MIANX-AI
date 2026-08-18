// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Error Classification & Tracking
// Classifies errors, captures safe context, supports grouping
// ══════════════════════════════════════════════════════════════════

import type { ErrorCategory, LogContext } from './logger'
import { logger } from './logger'
import { redactObject } from './redact'

export interface ErrorEntry {
  error_code: string
  category: ErrorCategory
  service: string
  environment: string
  trace_id?: string
  request_id?: string
  timestamp: string
  message: string
  safe_context: Record<string, unknown>
  fingerprint: string
}

/** Error categories matching the spec (Section 31) */
export const ErrorCategories = {
  USER_ERROR: 'USER_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  AI_ERROR: 'AI_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR',
} as const

/** Common error codes per category */
export const ErrorCodes: Record<string, Record<string, string>> = {
  AUTH_ERROR: {
    AUTH_SESSION_INVALID: 'AUTH_SESSION_INVALID',
    AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
    AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
    AUTH_CREDENTIALS_WRONG: 'AUTH_CREDENTIALS_WRONG',
  },
  AUTHORIZATION_ERROR: {
    AUTHZ_PERMISSION_DENIED: 'AUTHZ_PERMISSION_DENIED',
    AUTHZ_ROLE_MISSING: 'AUTHZ_ROLE_MISSING',
    AUTHZ_ORG_ACCESS_DENIED: 'AUTHZ_ORG_ACCESS_DENIED',
    AUTHZ_MEMBERSHIP_SUSPENDED: 'AUTHZ_MEMBERSHIP_SUSPENDED',
  },
  VALIDATION_ERROR: {
    VALIDATION_INPUT_INVALID: 'VALIDATION_INPUT_INVALID',
    VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
    VALIDATION_FORMAT_INVALID: 'VALIDATION_FORMAT_INVALID',
  },
  DATABASE_ERROR: {
    DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
    DB_QUERY_FAILED: 'DB_QUERY_FAILED',
    DB_TIMEOUT: 'DB_TIMEOUT',
    DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  },
  INTEGRATION_ERROR: {
    INT_EXTERNAL_API_ERROR: 'INT_EXTERNAL_API_ERROR',
    INT_WEBHOOK_DELIVERY_FAILED: 'INT_WEBHOOK_DELIVERY_FAILED',
    INT_AUTH_EXPIRED: 'INT_AUTH_EXPIRED',
    INT_RATE_LIMITED: 'INT_RATE_LIMITED',
  },
  AI_ERROR: {
    AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
    AI_MODEL_ERROR: 'AI_MODEL_ERROR',
    AI_TIMEOUT: 'AI_TIMEOUT',
    AI_POLICY_DENIED: 'AI_POLICY_DENIED',
    AI_TOOL_AUTH_FAILED: 'AI_TOOL_AUTH_FAILED',
    AI_LOOP_DETECTED: 'AI_LOOP_DETECTED',
  },
  SYSTEM_ERROR: {
    SYS_INTERNAL_ERROR: 'SYS_INTERNAL_ERROR',
    SYS_QUEUE_ERROR: 'SYS_QUEUE_ERROR',
    SYS_CONFIG_ERROR: 'SYS_CONFIG_ERROR',
  },
  SECURITY_ERROR: {
    SEC_PROMPT_INJECTION: 'SEC_PROMPT_INJECTION',
    SEC_SUSPICIOUS_ACTIVITY: 'SEC_SUSPICIOUS_ACTIVITY',
    SEC_TENANT_BREACH_ATTEMPT: 'SEC_TENANT_BREACH_ATTEMPT',
  },
  USER_ERROR: {
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_INPUT_ERROR: 'USER_INPUT_ERROR',
  },
  DEPENDENCY_ERROR: {
    DEP_UNAVAILABLE: 'DEP_UNAVAILABLE',
    DEP_TIMEOUT: 'DEP_TIMEOUT',
  },
}

/**
 * Classify an error into a category based on its characteristics.
 */
export function classifyError(error: unknown): { category: ErrorCategory; code: string } {
  if (error instanceof MianxAppError) {
    return { category: error.category, code: error.code }
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  const name = error instanceof Error ? error.constructor.name : ''

  if (message.includes('permission') || message.includes('forbidden') || message.includes('denied') || message.includes('403')) {
    return { category: 'AUTHORIZATION_ERROR', code: 'AUTHZ_PERMISSION_DENIED' }
  }
  if (message.includes('unauthorized') || message.includes('unauthenticated') || message.includes('401') || name === 'AuthenticationError') {
    return { category: 'AUTH_ERROR', code: 'AUTH_TOKEN_INVALID' }
  }
  if (message.includes('prisma') || message.includes('database') || message.includes('constraint') || message.includes('unique')) {
    return { category: 'DATABASE_ERROR', code: 'DB_QUERY_FAILED' }
  }
  if (message.includes('timeout') || message.includes('timed out') || message.includes('abort')) {
    return { category: 'DEPENDENCY_ERROR', code: 'DEP_TIMEOUT' }
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('econnrefused') || message.includes('external')) {
    return { category: 'INTEGRATION_ERROR', code: 'INT_EXTERNAL_API_ERROR' }
  }
  if (message.includes('ai') || message.includes('model') || message.includes('provider') || message.includes('token limit')) {
    return { category: 'AI_ERROR', code: 'AI_PROVIDER_ERROR' }
  }
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return { category: 'VALIDATION_ERROR', code: 'VALIDATION_INPUT_INVALID' }
  }

  return { category: 'SYSTEM_ERROR', code: 'SYS_INTERNAL_ERROR' }
}

/**
 * Generate a fingerprint for error grouping (same root cause = same fingerprint).
 */
export function fingerprint(error: unknown, code: string): string {
 const msg = error instanceof Error ? error.message : String(error)
  // Use error code + first line of stack (or message if no stack)
  const stackLine = error instanceof Error && error.stack
    ? error.stack.split('\n')[1]?.trim() || ''
    : ''
  const raw = `${code}:${stackLine || msg}`
  // Simple hash
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

/**
 * Track an error: classify, fingerprint, log, and optionally persist.
 */
export function trackError(
  error: unknown,
  ctx: LogContext = {}
): ErrorEntry {
  const { category, code } = classifyError(error)
  const fp = fingerprint(error, code)

  const entry: ErrorEntry = {
    error_code: code,
    category,
    service: ctx.service || 'mianx-core',
    environment: process.env.NODE_ENV || 'development',
    trace_id: ctx.trace_id,
    request_id: ctx.request_id,
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    safe_context: redactObject({
      ...ctx,
      error_name: error instanceof Error ? error.constructor.name : undefined,
    }),
    fingerprint: fp,
  }

  logger.error(`[${code}] ${entry.message}`, {
    ...ctx,
    error_code: code,
    error_category: category,
    fingerprint: fp,
  }, error instanceof Error ? error : undefined)

  return entry
}

/**
 * Custom application error with built-in classification.
 */
export class MianxAppError extends Error {
  public readonly category: ErrorCategory
  public readonly code: string
  public readonly statusCode: number

  constructor(
    message: string,
    category: ErrorCategory = 'SYSTEM_ERROR',
    code?: string,
    statusCode = 500
  ) {
    super(message)
    this.name = 'MianxAppError'
    this.category = category
    this.code = code || `MIX_${category}_001`
    this.statusCode = statusCode
  }

  static unauthorized(message = 'Authentication required'): MianxAppError {
    return new MianxAppError(message, 'AUTH_ERROR', 'AUTH_SESSION_INVALID', 401)
  }

  static forbidden(message = 'Permission denied'): MianxAppError {
    return new MianxAppError(message, 'AUTHORIZATION_ERROR', 'AUTHZ_PERMISSION_DENIED', 403)
  }

  static notFound(message = 'Resource not found'): MianxAppError {
    return new MianxAppError(message, 'USER_ERROR', 'USER_NOT_FOUND', 404)
  }

  static validation(message: string): MianxAppError {
    return new MianxAppError(message, 'VALIDATION_ERROR', 'VALIDATION_INPUT_INVALID', 400)
  }

  static database(message: string): MianxAppError {
    return new MianxAppError(message, 'DATABASE_ERROR', 'DB_QUERY_FAILED', 500)
  }

  static integration(message: string): MianxAppError {
    return new MianxAppError(message, 'INTEGRATION_ERROR', 'INT_EXTERNAL_API_ERROR', 502)
  }

  static aiError(message: string, code = 'AI_PROVIDER_ERROR'): MianxAppError {
    return new MianxAppError(message, 'AI_ERROR', code, 500)
  }
}
