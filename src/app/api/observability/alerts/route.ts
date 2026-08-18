// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: Alerts API
// List, acknowledge, and resolve alerts
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getAlerts, acknowledgeAlert, resolveAlert, hasP1Active } from '@/core/observability'
import type { AlertSeverity, AlertStatus, AlertOwner } from '@/core/observability'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const severity = searchParams.get('severity') as AlertSeverity | null
  const owner = searchParams.get('owner') as AlertOwner | null
  const status = searchParams.get('status') as AlertStatus | null

  const alerts = getAlerts({
    severity: severity || undefined,
    owner: owner || undefined,
    status: status || undefined,
  })

  return NextResponse.json({
    alerts,
    p1_active: hasP1Active(),
    total: alerts.length,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { fingerprint, action } = body as { fingerprint?: string; action?: 'acknowledge' | 'resolve' }

  if (!fingerprint || !action) {
    return NextResponse.json({ error: 'fingerprint and action are required' }, { status: 400 })
  }

  if (action === 'acknowledge') {
    const alert = acknowledgeAlert(fingerprint)
    if (!alert) return NextResponse.json({ error: 'Alert not found or not firing' }, { status: 404 })
    return NextResponse.json({ alert })
  }

  if (action === 'resolve') {
    const alert = resolveAlert(fingerprint)
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    return NextResponse.json({ alert })
  }

  return NextResponse.json({ error: 'Invalid action. Use acknowledge or resolve.' }, { status: 400 })
}
