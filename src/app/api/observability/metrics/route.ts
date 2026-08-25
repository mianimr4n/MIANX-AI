// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: Application Metrics API
// Returns all collected metrics (counters, histograms, gauges)
// Phase 22: Requires auth + observability.metrics.view permission
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { metrics } from '@/core/observability'
import { withAuth } from '@/core/authorization'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async () => {
  const allMetrics = metrics.getAll()
  const summary = metrics.getSummary()

  return NextResponse.json({
    metrics: allMetrics,
    summary,
    collected_at: new Date().toISOString(),
  })
}, { permission: 'observability.metrics.view' })
