// ══════════════════════════════════════════════════════════════════
// MIANX.AI — SLO Tracking Framework with Error Budget Calculations
// ══════════════════════════════════════════════════════════════════

export interface SLOTarget {
  name: string
  description: string
  target: number          // e.g. 0.999 = 99.9%
  window_days: number     // rolling window
  metric_name: string     // what metric drives this SLO
  labels?: Record<string, string>
}

export interface SLOPeriod {
  id: string
  slo_name: string
  period_start: string
  period_end: string
  total_events: number
  good_events: number
  bad_events: number
  availability: number    // good / total
  error_budget_total: number  // (1 - target) * total
  error_budget_consumed: number  // bad_events
  error_budget_remaining: number
  error_budget_percentage: number  // remaining / total
}

/** Pre-defined SLO targets */
export const DEFAULT_SLO_TARGETS: SLOTarget[] = [
  {
    name: 'api_availability',
    description: 'API availability (successful requests / total requests)',
    target: 0.999,
    window_days: 30,
    metric_name: 'http_requests_total',
  },
  {
    name: 'api_latency_p99',
    description: '99th percentile API latency under 5 seconds',
    target: 0.95,
    window_days: 30,
    metric_name: 'http_request_duration',
  },
  {
    name: 'workflow_completion',
    description: 'Workflow completion rate',
    target: 0.99,
    window_days: 30,
    metric_name: 'workflow_success_total',
  },
  {
    name: 'ai_availability',
    description: 'AI request success rate',
    target: 0.99,
    window_days: 30,
    metric_name: 'ai_requests_total',
  },
  {
    name: 'billing_processing',
    description: 'Billing/invoice processing success rate',
    target: 0.999,
    window_days: 30,
    metric_name: 'billing_invoices_processed',
  },
  {
    name: 'integration_reliability',
    description: 'External integration success rate',
    target: 0.99,
    window_days: 30,
    metric_name: 'integration_requests_total',
  },
]

/** In-memory SLO tracking */
const sloData = new Map<string, SLOPeriod[]>()

/**
 * Record an SLO event (good or bad).
 */
export function recordSLOEvent(sloName: string, isGood: boolean) {
  // For in-memory tracking, we maintain a simple running count
  const key = sloName
  const existing = sloData.get(key)?.[0]

  if (!existing) {
    sloData.set(key, [{
      id: `slo_${key}_${Date.now().toString(36)}`,
      slo_name: sloName,
      period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
      period_end: new Date().toISOString(),
      total_events: 1,
      good_events: isGood ? 1 : 0,
      bad_events: isGood ? 0 : 1,
      availability: isGood ? 1 : 0,
      error_budget_total: 1,
      error_budget_consumed: isGood ? 0 : 1,
      error_budget_remaining: isGood ? 1 : 0,
      error_budget_percentage: isGood ? 100 : 0,
    }])
    return
  }

  existing.total_events++
  if (isGood) {
    existing.good_events++
  } else {
    existing.bad_events++
  }
  existing.availability = existing.total_events > 0
    ? existing.good_events / existing.total_events
    : 1
  existing.error_budget_total = Math.round((1 - getSLOTarget(sloName)) * existing.total_events * 1000) / 1000
  existing.error_budget_consumed = existing.bad_events
  existing.error_budget_remaining = Math.max(0, existing.error_budget_total - existing.error_budget_consumed)
  existing.error_budget_percentage = existing.error_budget_total > 0
    ? Math.round((existing.error_budget_remaining / existing.error_budget_total) * 10000) / 100
    : 100
  existing.period_end = new Date().toISOString()
}

/**
 * Get the target for an SLO by name.
 */
export function getSLOTarget(sloName: string): number {
  return DEFAULT_SLO_TARGETS.find(s => s.name === sloName)?.target || 0.99
}

/**
 * Get current SLO status for all targets.
 */
export function getSLOStatus(): (SLOTarget & SLOPeriod)[] {
  return DEFAULT_SLO_TARGETS.map(target => {
    const periods = sloData.get(target.name)
    const latest = periods?.[0]
    return {
      ...target,
      id: latest?.id || '',
      slo_name: target.name,
      period_start: latest?.period_start || new Date().toISOString(),
      period_end: latest?.period_end || new Date().toISOString(),
      total_events: latest?.total_events || 0,
      good_events: latest?.good_events || 0,
      bad_events: latest?.bad_events || 0,
      availability: latest?.availability ?? 1,
      error_budget_total: latest?.error_budget_total ?? 0,
      error_budget_consumed: latest?.error_budget_consumed ?? 0,
      error_budget_remaining: latest?.error_budget_remaining ?? 0,
      error_budget_percentage: latest?.error_budget_percentage ?? 100,
    }
  })
}
