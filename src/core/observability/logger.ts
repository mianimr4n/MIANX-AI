// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Structured JSON Logger with Correlation ID Propagation
// Every log is machine-readable JSON with tenant context
// ══════════════════════════════════════════════════════════════════

import { redactObject, redactString } from './redact'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

export interface LogContext {
  service?: string
  event?: string
  organization_id?: string
  request_id?: string
  trace_id?: string
  span_id?: string
  user_id?: string
  workflow_run_id?: string
  agent_run_id?: string
  error_code?: string
  error_category?: ErrorCategory
  duration_ms?: number
  [key: string]: unknown
}

export type ErrorCategory =
  | 'USER_ERROR'
  | 'AUTH_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'DEPENDENCY_ERROR'
  | 'DATABASE_ERROR'
  | 'INTEGRATION_ERROR'
  | 'AI_ERROR'
  | 'SYSTEM_ERROR'
  | 'SECURITY_ERROR'

/** Minimum log level for production (avoid excessive DEBUG) */
const MIN_LEVEL: Record<string, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
}

const ENV_MIN_LEVEL =
  process.env.NODE_ENV === 'production'
    ? (MIN_LEVEL[process.env.LOG_LEVEL || 'INFO'] ?? 1)
    : 0 // All levels in dev

class Logger {
  private service: string

  constructor(service = 'mianx-core') {
    this.service = service
  }

  /** Generate a correlation ID if not provided */
  private static generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }

  /** Build a structured log entry */
  private structured(
    level: LogLevel,
    message: string,
    ctx: LogContext = {},
    error?: Error | unknown
  ): object {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: ctx.service || this.service,
      message: redactString(message),
    }

    if (ctx.event) entry.event = ctx.event
    if (ctx.organization_id) entry.organization_id = ctx.organization_id
    if (ctx.request_id) entry.request_id = ctx.request_id
    if (ctx.trace_id) entry.trace_id = ctx.trace_id
    if (ctx.span_id) entry.span_id = ctx.span_id
    if (ctx.user_id) entry.user_id = ctx.user_id
    if (ctx.workflow_run_id) entry.workflow_run_id = ctx.workflow_run_id
    if (ctx.agent_run_id) entry.agent_run_id = ctx.agent_run_id
    if (ctx.error_code) entry.error_code = ctx.error_code
    if (ctx.error_category) entry.error_category = ctx.error_category
    if (ctx.duration_ms !== undefined) entry.duration_ms = ctx.duration_ms

    // Attach extra context (redacted)
    const extraKeys = ['service', 'event', 'organization_id', 'request_id', 'trace_id',
      'span_id', 'user_id', 'workflow_run_id', 'agent_run_id', 'error_code',
      'error_category', 'duration_ms']
    for (const [key, value] of Object.entries(ctx)) {
      if (!extraKeys.includes(key) && value !== undefined) {
        entry[key] = typeof value === 'object' && value !== null
          ? redactObject(value as Record<string, unknown>)
          : redactString(String(value))
      }
    }

    // Attach error details
    if (error instanceof Error) {
      entry.error_type = error.constructor.name
      entry.error_message = redactString(error.message)
      if (error.stack) {
        entry.error_stack = error.stack.split('\n').slice(0, 10).join('\n')
      }
    } else if (error !== undefined) {
      entry.error = redactObject(
        typeof error === 'object' && error !== null
          ? error as Record<string, unknown>
          : { value: String(error) }
      )
    }

    return entry
  }

  /** Emit a log entry */
  private emit(level: LogLevel, message: string, ctx: LogContext = {}, error?: Error | unknown) {
    if ((MIN_LEVEL[level] ?? 0) < ENV_MIN_LEVEL) return
    const entry = this.structured(level, message, ctx, error)
    const json = JSON.stringify(entry)

    if (level === 'ERROR' || level === 'FATAL') {
      console.error(json)
    } else if (level === 'WARN') {
      console.warn(json)
    } else {
      console.log(json)
    }
  }

  debug(message: string, ctx?: LogContext, error?: Error | unknown) {
    this.emit('DEBUG', message, ctx, error)
  }

  info(message: string, ctx?: LogContext, error?: Error | unknown) {
    this.emit('INFO', message, ctx, error)
  }

  warn(message: string, ctx?: LogContext, error?: Error | unknown) {
    this.emit('WARN', message, ctx, error)
  }

  error(message: string, ctx?: LogContext, error?: Error | unknown) {
    this.emit('ERROR', message, ctx, error)
  }

  fatal(message: string, ctx?: LogContext, error?: Error | unknown) {
    this.emit('FATAL', message, ctx, error)
  }

  /** Create a child logger with bound context */
  child(bindings: LogContext): Logger {
    const child = new Logger(this.service)
    const originalEmit = child.emit.bind(child)
    child.emit = (level, message, ctx, err) => {
      originalEmit(level, message, { ...bindings, ...ctx }, err)
    }
    return child
  }

  /** Generate a new request ID */
  static requestId(): string {
    return Logger.generateId()
  }

  /** Generate a new trace ID */
  static traceId(): string {
    return Logger.generateId()
  }

  /** Generate a new span ID */
  static spanId(): string {
    return Math.random().toString(36).slice(2, 18)
  }
}

/** Default logger instance */
export const logger = new Logger('mianx-core')

/** Application-level event names matching the spec */
export const AppEvents = {
  REQUEST_STARTED: 'request.started',
  REQUEST_COMPLETED: 'request.completed',
  REQUEST_FAILED: 'request.failed',
  AUTH_FAILED: 'authentication.failed',
  AUTH_DENIED: 'authorization.denied',
  RESOURCE_CREATED: 'resource.created',
  RESOURCE_UPDATED: 'resource.updated',
  RESOURCE_DELETED: 'resource.deleted',
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_FAILED: 'workflow.failed',
  INTEGRATION_FAILED: 'integration.failed',
  AI_RUN_STARTED: 'ai.run.started',
  AI_RUN_COMPLETED: 'ai.run.completed',
  AI_RUN_FAILED: 'ai.run.failed',
  JOB_STARTED: 'job.started',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  ALERT_FIRED: 'alert.fired',
  ALERT_RESOLVED: 'alert.resolved',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_UPDATED: 'incident.updated',
  INCIDENT_RESOLVED: 'incident.resolved',
} as const

export type AppEvent = (typeof AppEvents)[keyof typeof AppEvents]
