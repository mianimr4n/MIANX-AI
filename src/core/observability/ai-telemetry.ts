// ══════════════════════════════════════════════════════════════════
// MIANX.AI — AI Telemetry: Quality, Safety, and Cost Signals
// Tracks AI run observability without exposing private prompt content
// ══════════════════════════════════════════════════════════════════

import { logger, AppEvents } from './logger'
import { metrics, MetricNames } from './metrics'

export interface AIRunContext {
  agent?: string
  model?: string
  provider?: string
  organization_id?: string
  domain?: string
  request_id?: string
  trace_id?: string
  conversation_id?: string
  user_id?: string
}

export interface AIRunResult {
  success: boolean
  duration_ms: number
  tokens_in: number
  tokens_out: number
  tool_calls?: number
  tool_successes?: number
  tool_failures?: number
  estimated_cost_usd?: number
  error_code?: string
  approval_requested?: boolean
  approval_granted?: boolean
  fallback_used?: boolean
  fallback_model?: string
  policy_denied?: boolean
  prompt_injection_detected?: boolean
  agent_loop_detected?: boolean
  excessive_retries?: boolean
}

/**
 * Record a complete AI run for telemetry.
 */
export function recordAIRun(ctx: AIRunContext, result: AIRunResult) {
  const labels: Record<string, string> = {
    ...(ctx.agent ? { agent: ctx.agent } : {}),
    ...(ctx.model ? { model: ctx.model } : {}),
    ...(ctx.provider ? { provider: ctx.provider } : {}),
    ...(ctx.domain ? { domain: ctx.domain } : {}),
  }

  // Duration
  metrics.observeHistogram(MetricNames.AI_REQUEST_DURATION, result.duration_ms, labels)

  // Counters
  metrics.incCounter(MetricNames.AI_REQUESTS_TOTAL, 1, {
    ...labels,
    status: result.success ? 'success' : 'failure',
  })

  if (!result.success) {
    metrics.incCounter(MetricNames.AI_ERRORS_TOTAL, 1, {
      ...labels,
      error_code: result.error_code || 'UNKNOWN',
    })
  }

  // Token usage
  metrics.incCounter(MetricNames.AI_TOKENS_TOTAL, result.tokens_in, {
    ...labels,
    direction: 'input',
  })
  metrics.incCounter(MetricNames.AI_TOKENS_TOTAL, result.tokens_out, {
    ...labels,
    direction: 'output',
  })

  // Cost
  if (result.estimated_cost_usd !== undefined) {
    metrics.incCounter(MetricNames.AI_COST_ESTIMATED, result.estimated_cost_usd * 1000, labels) // in milli-USD
  }

  // Quality signals
  if (result.tool_successes !== undefined) {
    metrics.incCounter(MetricNames.AI_TOOL_SUCCESS_TOTAL, result.tool_successes, labels)
  }
  if (result.tool_failures !== undefined) {
    metrics.incCounter(MetricNames.AI_TOOL_FAILURE_TOTAL, result.tool_failures, labels)
  }
  if (result.success) {
    metrics.incCounter(MetricNames.AI_TASK_COMPLETION_TOTAL, 1, labels)
  }
  if (result.approval_requested) {
    metrics.incCounter(MetricNames.AI_APPROVAL_REQUESTED_TOTAL, 1, labels)
  }

  // Safety signals
  if (result.policy_denied) {
    metrics.incCounter(MetricNames.AI_POLICY_DENIALS_TOTAL, 1, labels)
  }
  if (result.policy_denied || result.tool_failures) {
    // Tool auth failures are a subset of tool failures
    const authFailures = result.tool_failures ? Math.min(result.tool_failures, 1) : 0
    metrics.incCounter(MetricNames.AI_TOOL_AUTH_FAILURES_TOTAL, authFailures, labels)
  }
  if (result.agent_loop_detected) {
    metrics.incCounter(MetricNames.AI_LOOP_DETECTIONS_TOTAL, 1, labels)
  }
  if (result.excessive_retries) {
    metrics.incCounter(MetricNames.AI_EXCESSIVE_RETRIES_TOTAL, 1, labels)
  }

  // Structured log
  const logEvent = result.success ? AppEvents.AI_RUN_COMPLETED : AppEvents.AI_RUN_FAILED
  logger.info(logEvent, {
    event: logEvent,
    organization_id: ctx.organization_id,
    request_id: ctx.request_id,
    trace_id: ctx.trace_id,
    user_id: ctx.user_id,
    agent: ctx.agent,
    model: ctx.model,
    provider: ctx.provider,
    domain: ctx.domain,
    duration_ms: result.duration_ms,
    tokens_in: result.tokens_in,
    tokens_out: result.tokens_out,
    tool_calls: result.tool_calls,
    tool_successes: result.tool_successes,
    tool_failures: result.tool_failures,
    estimated_cost_usd: result.estimated_cost_usd,
    success: result.success,
    approval_requested: result.approval_requested,
    fallback_used: result.fallback_used,
    policy_denied: result.policy_denied,
    agent_loop_detected: result.agent_loop_detected,
  })
}

/**
 * Get AI cost breakdown for a time range (in-memory from metrics).
 */
export function getAICostSummary(): {
  total_requests: number
  total_errors: number
  total_tokens_in: number
  total_tokens_out: number
  total_cost_milli_usd: number
  policy_denials: number
  loop_detections: number
} {
  const all = metrics.getAll()
  let total_requests = 0
  let total_errors = 0
  let total_tokens_in = 0
  let total_tokens_out = 0
  let total_cost = 0
  let policy_denials = 0
  let loops = 0

  for (const m of all) {
    if (m.type === 'counter') {
      if (m.name === MetricNames.AI_REQUESTS_TOTAL) total_requests += m.value
      if (m.name === MetricNames.AI_ERRORS_TOTAL) total_errors += m.value
      if (m.name === MetricNames.AI_TOKENS_TOTAL && m.labels.direction === 'input') total_tokens_in += m.value
      if (m.name === MetricNames.AI_TOKENS_TOTAL && m.labels.direction === 'output') total_tokens_out += m.value
      if (m.name === MetricNames.AI_COST_ESTIMATED) total_cost += m.value
      if (m.name === MetricNames.AI_POLICY_DENIALS_TOTAL) policy_denials += m.value
      if (m.name === MetricNames.AI_LOOP_DETECTIONS_TOTAL) loops += m.value
    }
  }

  return {
    total_requests,
    total_errors,
    total_tokens_in: total_tokens_in,
    total_tokens_out: total_tokens_out,
    total_cost_milli_usd: total_cost,
    policy_denials,
    loop_detections: loops,
  }
}
