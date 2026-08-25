// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: Alerts API
// List, acknowledge, and resolve alerts
// Phase 22: GET requires auth. POST (ack/resolve) requires auth + manage.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getAlerts, acknowledgeAlert, resolveAlert, hasP1Active } from '@/core/observability'
import type { AlertSeverity, AlertStatus, AlertOwner } from '@/core/observability'
import { withAuth, type AuthContext } from '@/core/authorization'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest) => {
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
}, { anyPermission: ['observability.alerts.view', 'observability.alerts.manage'] })

export const POST = withAuth(async (request: NextRequest) => {
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
}, { permission: 'observability.alerts.manage' })
