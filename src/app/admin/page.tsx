'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/composite/kpi-card'
import { StatusBadge } from '@/components/composite/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Users, Blocks, Workflow, Bot, FileText, Activity, AlertTriangle } from 'lucide-react'

type PlatformData = {
  platform_health: { availability: string }
  business_health: {
    active_organizations: number
    total_memberships: number
    active_domains: number
    active_workflows: number
    total_conversations: number
    total_jobs_processed: number
    total_invoices: number
  }
  alerts: { p1_active: number; p2_active: number; total_active: number }
  incidents: { active: number; items: Array<{ id: string; title: string; severity: string; status: string; service: string; detected_at: string }> }
  slo_summary: Array<{ name: string; target: number; availability: number; error_budget_remaining_pct: number }>
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<PlatformData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/command-center/platform')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Platform Overview</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Platform Overview</h1>
        <Card><CardContent className="p-6"><p className="text-destructive">Failed to load platform data: {error}</p></CardContent></Card>
      </div>
    )
  }

  const bh = data.business_health

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time platform health and business metrics</p>
      </div>

      {/* Health status bar */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${data.alerts.p1_active > 0 ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/50'}`}>
        <div className={`h-3 w-3 rounded-full ${data.platform_health.availability === 'operational' ? 'bg-green-500' : 'bg-destructive'}`} />
        <span className="text-sm font-medium">
          {data.platform_health.availability === 'operational' ? 'All Systems Operational' : 'Issues Detected'}
        </span>
        {data.alerts.total_active > 0 && (
          <span className="ml-auto text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {data.alerts.p1_active} P1 / {data.alerts.p2_active} P2 alerts active
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Organizations" value={bh.active_organizations} icon={Building2} description="Active organizations" />
        <KPICard title="Users" value={bh.total_memberships} icon={Users} description="Total memberships" />
        <KPICard title="Domains" value={bh.active_domains} icon={Blocks} description="Active domains" />
        <KPICard title="Workflows" value={bh.active_workflows} icon={Workflow} description="Active workflows" />
        <KPICard title="AI Conversations" value={bh.total_conversations} icon={Bot} description="Total conversations" />
        <KPICard title="Jobs Processed" value={bh.total_jobs_processed} icon={Activity} description="Completed jobs" />
        <KPICard title="Invoices" value={bh.total_invoices} icon={FileText} description="Total invoices" />
        <KPICard title="Active Incidents" value={data.incidents.active} icon={AlertTriangle} description="Unresolved incidents" />
      </div>

      {/* Active Incidents */}
      {data.incidents.items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.incidents.items.map((inc) => (
                <div key={inc.id} className="flex items-center gap-3 p-2 rounded-md border text-sm">
                  <StatusBadge status={inc.severity === 'P1' ? 'error' : 'warning'} label={inc.severity} />
                  <span className="flex-1 truncate">{inc.title}</span>
                  <span className="text-xs text-muted-foreground">{inc.service}</span>
                  <StatusBadge status={inc.status === 'investigating' ? 'warning' : 'error'} label={inc.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SLO Summary */}
      {data.slo_summary.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SLO Status</CardTitle>
            <CardDescription>Service level objectives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.slo_summary.map((slo) => (
                <div key={slo.name} className="flex items-center gap-4 text-sm">
                  <span className="w-32 font-medium truncate">{slo.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${slo.availability >= slo.target ? 'bg-green-500' : 'bg-destructive'}`}
                      style={{ width: `${Math.min(slo.availability, 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-muted-foreground">{slo.availability.toFixed(2)}%</span>
                  <span className="w-16 text-right text-xs text-muted-foreground">Target: {slo.target}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}