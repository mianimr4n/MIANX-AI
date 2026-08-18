// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: SLO Status API
// Returns all SLO targets with current availability and error budgets
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { getSLOStatus } from '@/core/observability'

export const dynamic = 'force-dynamic'

export async function GET() {
  const status = getSLOStatus()
  return NextResponse.json({ slos: status })
}
