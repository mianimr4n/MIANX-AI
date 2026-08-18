// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Alert Routing System
// P1-P4 severity, deduplication, routing by ownership
// ══════════════════════════════════════════════════════════════════

import { logger, AppEvents } from './logger'

export type AlertSeverity = 'P1' | 'P2' | 'P3' | 'P4'

export type AlertOwner = 'platform' | 'database' | 'security' | 'ai' | 'billing' | 'domain' | 'integration'

export type AlertStatus = 'firing' | 'acknowledged' | 'resolved' | 'silenced'

export interface Alert {
  id: string
  severity: AlertSeverity
  status: AlertStatus
  owner: AlertOwner
  name: string
  description: string
  // What is wrong?
  what: string
  // Why does it matter?
  why: string
  // Who owns it?
  who: string
  // What should be done?
  action: string
  fingerprint: string
  fired_at: string
  acknowledged_at?: string
  resolved_at?: string
  silenced_until?: string
  organization_id?: string
  labels: Record<string, string>
}

/** In-memory alert store */
const alertStore = new Map<string, Alert>()

/** Deduplication window in ms */
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/** Severity priority (lower = more severe) */
const SEVERITY_ORDER: Record<AlertSeverity, number> = { P1: 0, P2: 1, P3: 2, P4: 3 }

/**
 * Fire an alert. Deduplicates based on fingerprint.
 */
export function fireAlert(params: {
  severity: AlertSeverity
  owner: AlertOwner
  name: string
  description: string
  what: string
  why: string
  who: string
  action: string
  fingerprint: string
  organization_id?: string
  labels?: Record<string, string>
}): Alert {
  const existing = alertStore.get(params.fingerprint)

  // Deduplicate: if same fingerprint fired recently, return existing
  if (existing && existing.status === 'firing') {
    const age = Date.now() - new Date(existing.fired_at).getTime()
    if (age < DEDUP_WINDOW_MS) {
      return existing
    }
  }

  const alert: Alert = {
    id: `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    severity: params.severity,
    status: 'firing',
    owner: params.owner,
    name: params.name,
    description: params.description,
    what: params.what,
    why: params.why,
    who: params.who,
    action: params.action,
    fingerprint: params.fingerprint,
    fired_at: new Date().toISOString(),
    organization_id: params.organization_id,
    labels: params.labels || {},
  }

  alertStore.set(params.fingerprint, alert)

  logger.warn(`Alert fired: [${params.severity}] ${params.name}`, {
    event: AppEvents.ALERT_FIRED,
    alert_id: alert.id,
    severity: params.severity,
    owner: params.owner,
    organization_id: params.organization_id,
  })

  return alert
}

/**
 * Acknowledge an alert.
 */
export function acknowledgeAlert(fingerprint: string): Alert | null {
  const alert = alertStore.get(fingerprint)
  if (!alert || alert.status !== 'firing') return null
  alert.status = 'acknowledged'
  alert.acknowledged_at = new Date().toISOString()
  return alert
}

/**
 * Resolve an alert.
 */
export function resolveAlert(fingerprint: string): Alert | null {
  const alert = alertStore.get(fingerprint)
  if (!alert || alert.status === 'resolved') return null
  alert.status = 'resolved'
  alert.resolved_at = new Date().toISOString()

  logger.info(`Alert resolved: [${alert.severity}] ${alert.name}`, {
    event: AppEvents.ALERT_RESOLVED,
    alert_id: alert.id,
    fingerprint,
  })

  return alert
}

/**
 * Get all active (firing + acknowledged) alerts.
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(alertStore.values())
    .filter(a => a.status === 'firing' || a.status === 'acknowledged')
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

/**
 * Get all alerts, optionally filtered.
 */
export function getAlerts(filter?: { severity?: AlertSeverity; owner?: AlertOwner; status?: AlertStatus }): Alert[] {
  let result = Array.from(alertStore.values())
  if (filter?.severity) result = result.filter(a => a.severity === filter.severity)
  if (filter?.owner) result = result.filter(a => a.owner === filter.owner)
  if (filter?.status) result = result.filter(a => a.status === filter.status)
  return result.sort((a, b) => new Date(b.fired_at).getTime() - new Date(a.fired_at).getTime())
}

/**
 * Check if a P1 alert is active (system-wide critical).
 */
export function hasP1Active(): boolean {
  return Array.from(alertStore.values()).some(a => a.severity === 'P1' && a.status === 'firing')
}
