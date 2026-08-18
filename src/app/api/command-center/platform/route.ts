// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Command Center: Platform Overview
// Shows availability, request volume, error rate, latency, active incidents,
// deployment health, and business health KPIs
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { metrics } from '@/core/observability'
import { getActiveAlerts } from '@/core/observability/alerts'
import { listIncidents } from '@/core/observability/incidents'
import { getSLOStatus } from '@/core/observability/slo'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()

  // Platform health metrics (in-memory)
 const metricsSummary = metrics.getSummary()

  // Business health KPIs from DB
  let businessHealth = {
    active_organizations: 0,
    total_memberships: 0,
    active_domains: 0,
    active_workflows: 0,
    total_conversations: 0,
    total_jobs_processed: 0,
    total_invoices: 0,
  }

  try {
    const [orgs, memberships, orgDomains, workflows, convos, jobs, invoices] = await Promise.all([
      db.organization.count({ where: { status: 'active' } }),
      db.organizationMembership.count({ where: { status: 'active' } }),
      db.organizationDomain.count({ where: { status: 'active' } }),
      db.workflow.count({ where: { status: 'active' } }),
      db.conversation.count(),
      db.job.count({ where: { status: 'completed' } }),
      db.invoice.count(),
    ])
    businessHealth = {
      active_organizations: orgs,
      total_memberships: memberships,
      active_domains: orgDomains,
      active_workflows: workflows,
      total_conversations: convos,
      total_jobs_processed: jobs,
      total_invoices: invoices,
    }
  } catch {
    // DB query may fail in dev
  }

  // Active alerts and incidents
  const activeAlerts = getActiveAlerts()
  const activeIncidents = listIncidents().filter(i => i.status !== 'resolved')

  // SLO status
  const sloStatus = getSLOStatus()

  const latency = Date.now() - startTime

  return NextResponse.json({
    platform_health: {
      availability: 'operational',
      ...metricsSummary.application_health,
    },
    business_health: businessHealth,
    alerts: {
      p1_active: activeAlerts.filter(a => a.severity === 'P1').length,
      p2_active: activeAlerts.filter(a => a.severity === 'P2').length,
      total_active: activeAlerts.length,
    },
    incidents: {
      active: activeIncidents.length,
      items: activeIncidents.slice(0, 10).map(i => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        service: i.service,
        detected_at: i.detected_at,
      })),
    },
    slo_summary: sloStatus.map(s => ({
      name: s.name,
      target: s.target,
      availability: s.availability,
      error_budget_remaining_pct: s.error_budget_percentage,
    })),
    latency_ms: latency,
    timestamp: new Date().toISOString(),
  })
}
