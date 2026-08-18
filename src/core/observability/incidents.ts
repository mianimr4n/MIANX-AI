// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Incident Model
// Lifecycle: Detected → Acknowledged → Investigating → Mitigating → Monitoring → Resolved
// ══════════════════════════════════════════════════════════════════

import { logger, AppEvents } from './logger'
import type { AlertSeverity } from './alerts'
import { redactObject } from './redact'

export type IncidentStatus =
  | 'detected'
  | 'acknowledged'
  | 'investigating'
  | 'mitigating'
  | 'monitoring'
  | 'resolved'

export type IncidentSeverity = AlertSeverity

export interface IncidentTimelineEntry {
  status: IncidentStatus
  timestamp: string
  actor_id?: string
  note?: string
  what_changed?: string
  what_observed?: string
  mitigation_attempted?: string
}

export interface Incident {
  id: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  service: string
  owner: string
  detected_at: string
  started_at?: string
  resolved_at?: string
  impact: string
  organization_id?: string
  timeline: IncidentTimelineEntry[]
  commander?: string
  technical_lead?: string
  communications_owner?: string
  sme?: string
}

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  detected: ['acknowledged'],
  acknowledged: ['investigating'],
  investigating: ['mitigating'],
  mitigating: ['monitoring', 'investigating'],
  monitoring: ['resolved', 'mitigating'],
  resolved: [],
}

/** In-memory incident store */
const incidentStore = new Map<string, Incident>()

/**
 * Create a new incident.
 */
export function createIncident(params: {
  title: string
  severity: IncidentSeverity
  service: string
  owner: string
  impact: string
  organization_id?: string
  commander?: string
  technical_lead?: string
  communications_owner?: string
  sme?: string
  note?: string
}): Incident {
  const id = `inc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const now = new Date().toISOString()

  const incident: Incident = {
    id,
    title: params.title,
    severity: params.severity,
    status: 'detected',
    service: params.service,
    owner: params.owner,
    detected_at: now,
    impact: params.impact,
    organization_id: params.organization_id,
    commander: params.commander,
    technical_lead: params.technical_lead,
    communications_owner: params.communications_owner,
    sme: params.sme,
    timeline: [
      {
        status: 'detected',
        timestamp: now,
        note: params.note,
      },
    ],
  }

  incidentStore.set(id, incident)

  logger.warn(`Incident created: [${params.severity}] ${params.title}`, {
    event: AppEvents.INCIDENT_CREATED,
    incident_id: id,
    severity: params.severity,
    service: params.service,
    owner: params.owner,
    organization_id: params.organization_id,
  })

  return incident
}

/**
 * Transition an incident to a new status.
 */
export function transitionIncident(
  incidentId: string,
  newStatus: IncidentStatus,
  actor?: {
    id: string
    note?: string
    what_changed?: string
    what_observed?: string
    mitigation_attempted?: string
  }
): Incident | null {
  const incident = incidentStore.get(incidentId)
  if (!incident) return null

  const allowed = VALID_TRANSITIONS[incident.status]
  if (!allowed.includes(newStatus)) {
    logger.error(`Invalid incident transition: ${incident.status} -> ${newStatus}`, {
      incident_id: incidentId,
    })
    return null
  }

  incident.status = newStatus
  const now = new Date().toISOString()

  if (newStatus === 'acknowledged') {
    incident.started_at = now
  }
  if (newStatus === 'resolved') {
    incident.resolved_at = now
  }

  incident.timeline.push({
    status: newStatus,
    timestamp: now,
    actor_id: actor?.id,
    note: actor?.note,
    what_changed: actor?.what_changed,
    what_observed: actor?.what_observed,
    mitigation_attempted: actor?.mitigation_attempted,
  })

  const isTerminal = newStatus === 'resolved'
  logger.info(`Incident ${isTerminal ? 'resolved' : 'updated'}: [${incident.severity}] ${incident.title}`, {
    event: isTerminal ? AppEvents.INCIDENT_RESOLVED : AppEvents.INCIDENT_UPDATED,
    incident_id: incidentId,
    status: newStatus,
  })

  return incident
}

/**
 * Get an incident by ID.
 */
export function getIncident(incidentId: string): Incident | null {
  return incidentStore.get(incidentId) || null
}

/**
 * List all incidents, optionally filtered by status.
 */
export function listIncidents(filter?: { status?: IncidentStatus; severity?: IncidentSeverity }): Incident[] {
  let result = Array.from(incidentStore.values())
  if (filter?.status) result = result.filter(i => i.status === filter.status)
  if (filter?.severity) result = result.filter(i => i.severity === filter.severity)
  return result.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
}

/**
 * Calculate MTTR (Mean Time To Resolve) in ms for resolved incidents.
 */
export function calculateMTTR(): number {
  const resolved = Array.from(incidentStore.values()).filter(
    i => i.status === 'resolved' && i.detected_at && i.resolved_at
  )
  if (resolved.length === 0) return 0
  const totalTime = resolved.reduce((sum, i) => {
    return sum + (new Date(i.resolved_at!).getTime() - new Date(i.detected_at).getTime())
  }, 0)
  return totalTime / resolved.length
}
