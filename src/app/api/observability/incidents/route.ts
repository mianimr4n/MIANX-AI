// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: Incidents API
// Create, list, and transition incidents
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createIncident, listIncidents, transitionIncident, calculateMTTR } from '@/core/observability'
import type { IncidentStatus, IncidentSeverity } from '@/core/observability'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') as IncidentStatus | null
  const severity = searchParams.get('severity') as IncidentSeverity | null

  const incidents = listIncidents({
    status: status || undefined,
    severity: severity || undefined,
  })

  const mttr_ms = calculateMTTR()

  return NextResponse.json({
    incidents,
    mttr_ms,
    total: incidents.length,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Create incident
  if (body.title) {
    const incident = createIncident({
      title: body.title,
      severity: body.severity || 'P3',
      service: body.service || 'unknown',
      owner: body.owner || 'platform',
      impact: body.impact || '',
      note: body.note,
      organization_id: body.organization_id,
      commander: body.commander,
      technical_lead: body.technical_lead,
      communications_owner: body.communications_owner,
      sme: body.sme,
    })
    return NextResponse.json({ incident }, { status: 201 })
  }

  // Transition incident
  if (body.incident_id && body.new_status) {
    const incident = transitionIncident(body.incident_id, body.new_status as IncidentStatus, {
      id: body.actor_id,
      note: body.note,
      what_changed: body.what_changed,
      what_observed: body.what_observed,
      mitigation_attempted: body.mitigation_attempted,
    })
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found or invalid transition' }, { status: 404 })
    }
    return NextResponse.json({ incident })
  }

  return NextResponse.json({ error: 'Provide title (create) or incident_id + new_status (transition)' }, { status: 400 })
}
