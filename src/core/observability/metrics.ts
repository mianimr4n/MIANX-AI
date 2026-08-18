// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Application Metrics
// In-memory metrics collection with histogram support
// ══════════════════════════════════════════════════════════════════

/** Latency histogram bucket boundaries (ms) */
const LATENCY_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

export interface CounterMetric {
  type: 'counter'
  name: string
  value: number
  labels: Record<string, string>
}

export interface HistogramMetric {
  type: 'histogram'
  name: string
  count: number
  sum: number
  buckets: Record<string, number>
  labels: Record<string, string>
}

export interface GaugeMetric {
  type: 'gauge'
  name: string
  value: number
  labels: Record<string, string>
}

export type Metric = CounterMetric | HistogramMetric | GaugeMetric

class MetricsRegistry {
  private counters = new Map<string, CounterMetric>()
  private histograms = new Map<string, HistogramMetric>()
  private gauges = new Map<string, GaugeMetric>()

  /**
   * Record a counter increment.
   */
  incCounter(name: string, value = 1, labels: Record<string, string> = {}) {
    const key = this.key(name, labels)
    const existing = this.counters.get(key)
    if (existing) {
      existing.value += value
    } else {
      this.counters.set(key, { type: 'counter', name, value, labels })
    }
  }

  /**
   * Record a latency observation into a histogram.
   */
  observeHistogram(name: string, valueMs: number, labels: Record<string, string> = {}) {
    const key = this.key(name, labels)
    const existing = this.histograms.get(key)
    const buckets: Record<string, number> = {}
    for (const b of LATENCY_BUCKETS) {
      buckets[String(b)] = valueMs <= b ? 1 : 0
    }
    buckets['+Inf'] = 1

    if (existing) {
      existing.count++
      existing.sum += valueMs
      for (const b of LATENCY_BUCKETS) {
        existing.buckets[String(b)] += buckets[String(b)]
      }
      existing.buckets['+Inf']++
    } else {
      this.histograms.set(key, {
        type: 'histogram', name, count: 1, sum: valueMs, buckets, labels,
      })
    }
  }

  /**
   * Set a gauge value.
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.key(name, labels)
    this.gauges.set(key, { type: 'gauge', name, value, labels })
  }

  /**
   * Get percentile estimate from histogram buckets.
   */
  getPercentile(name: string, percentile: number, labels: Record<string, string> = {}): number {
    const key = this.key(name, labels)
    const hist = this.histograms.get(key)
    if (!hist || hist.count === 0) return 0

    // Estimate percentile from bucket boundaries
    const sortedBuckets = LATENCY_BUCKETS.slice().sort((a, b) => a - b)
    const target = hist.count * percentile
    let cumulative = 0

    for (const boundary of sortedBuckets) {
      cumulative += hist.buckets[String(boundary)] || 0
      if (cumulative >= target) {
        return boundary
      }
    }
    return sortedBuckets[sortedBuckets.length - 1]
  }

  /**
   * Get all collected metrics.
   */
  getAll(): Metric[] {
    return [
      ...this.counters.values(),
      ...this.histograms.values(),
      ...this.gauges.values(),
    ]
  }

  /**
   * Get metrics summary for a specific category.
   */
  getSummary(): {
    platform_health: Record<string, unknown>
    application_health: Record<string, unknown>
  } {
    // Platform gauges
    const platformHealth: Record<string, unknown> = {}
    for (const [, g] of this.gauges) {
      if (g.name.startsWith('platform_')) {
        platformHealth[g.name] = { value: g.value, labels: g.labels }
      }
    }

    // Application request metrics
    const appHealth: Record<string, unknown> = {
      total_requests: 0,
      error_count: 0,
      avg_latency_ms: 0,
      p50_latency_ms: 0,
      p95_latency_ms: 0,
      p99_latency_ms: 0,
    }

    const reqKey = this.key('http_request_duration', {})
    const reqHist = this.histograms.get(reqKey)
    if (reqHist && reqHist.count > 0) {
      appHealth.total_requests = reqHist.count
      appHealth.avg_latency_ms = Math.round(reqHist.sum / reqHist.count)
      appHealth.p50_latency_ms = this.getPercentile('http_request_duration', 0.50)
      appHealth.p95_latency_ms = this.getPercentile('http_request_duration', 0.95)
      appHealth.p99_latency_ms = this.getPercentile('http_request_duration', 0.99)
    }

    const errKey = this.key('http_errors_total', {})
    const errCounter = this.counters.get(errKey)
    if (errCounter) {
      appHealth.error_count = errCounter.value
    }

    return { platform_health: platformHealth, application_health: appHealth }
  }

  /**
   * Reset all metrics (useful for testing).
   */
  reset() {
    this.counters.clear()
    this.histograms.clear()
    this.gauges.clear()
  }

  private key(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(',')
    return labelStr ? `${name}{${labelStr}}` : name
  }
}

/** Global metrics registry */
export const metrics = new MetricsRegistry()

// ── Pre-defined metric names matching the spec ────────────────

export const MetricNames = {
  // Application Health
  HTTP_REQUEST_DURATION: 'http_request_duration',
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_ERRORS_TOTAL: 'http_errors_total',
  HTTP_AUTHZ_DENIALS: 'http_authz_denials_total',

  // Database
  DB_QUERY_DURATION: 'db_query_duration',
  DB_CONNECTIONS_ACTIVE: 'db_connections_active',
  DB_ERRORS_TOTAL: 'db_errors_total',

  // Queue / Jobs
  JOB_QUEUE_DEPTH: 'job_queue_depth',
  JOB_SUCCESS_TOTAL: 'job_success_total',
  JOB_FAILURE_TOTAL: 'job_failure_total',
  JOB_DURATION: 'job_duration',

  // Workflow
  WORKFLOW_DURATION: 'workflow_duration',
  WORKFLOW_SUCCESS_TOTAL: 'workflow_success_total',
  WORKFLOW_FAILURE_TOTAL: 'workflow_failure_total',

  // Integration
  INTEGRATION_REQUEST_DURATION: 'integration_request_duration',
  INTEGRATION_ERRORS_TOTAL: 'integration_errors_total',

  // AI
  AI_REQUEST_DURATION: 'ai_request_duration',
  AI_REQUESTS_TOTAL: 'ai_requests_total',
  AI_ERRORS_TOTAL: 'ai_errors_total',
  AI_TOKENS_TOTAL: 'ai_tokens_total',
  AI_COST_ESTIMATED: 'ai_cost_estimated',

  // AI Quality
  AI_TOOL_SUCCESS_TOTAL: 'ai_tool_success_total',
  AI_TOOL_FAILURE_TOTAL: 'ai_tool_failure_total',
  AI_TASK_COMPLETION_TOTAL: 'ai_task_completion_total',
  AI_APPROVAL_REQUESTED_TOTAL: 'ai_approval_requested_total',

  // AI Safety
  AI_POLICY_DENIALS_TOTAL: 'ai_policy_denials_total',
  AI_TOOL_AUTH_FAILURES_TOTAL: 'ai_tool_auth_failures_total',
  AI_LOOP_DETECTIONS_TOTAL: 'ai_loop_detections_total',
  AI_EXCESSIVE_RETRIES_TOTAL: 'ai_excessive_retries_total',

  // Business
  ACTIVE_ORGANIZATIONS: 'active_organizations',
  ACTIVE_USERS: 'active_users',
  ACTIVE_DOMAINS: 'active_domains',
} as const
