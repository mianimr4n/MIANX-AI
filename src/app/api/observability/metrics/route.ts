// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: Application Metrics API
// Returns all collected metrics (counters, histograms, gauges)
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { metrics } from '@/core/observability'

export const dynamic = 'force-dynamic'

export async function GET() {
  const allMetrics = metrics.getAll()
  const summary = metrics.getSummary()

  return NextResponse.json({
    metrics: allMetrics,
    summary,
    collected_at: new Date().toISOString(),
  })
}
