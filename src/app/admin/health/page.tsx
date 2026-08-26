'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/composite/status-badge'
import { Activity } from 'lucide-react'

type HealthData = {
  status: string
  app: string
  version: string
  phase: number
  checks: { database: { status: string; latency_ms: number }; api: { status: string; latency_ms: number } }
  timestamp: string
}

type SLOData = Array<{ name: string; target: number; availability: number; error_budget_remaining_pct: number }>

type AlertsData = Array<{ id: string; severity: string; title: string; service: string; detected_at: string; status: string }>

type MetricsData = { uptime_pct: number; total_requests: number; error_rate_pct: number; avg_latency_ms: number }

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [slos, setSlos] = useState<SLOData>([])
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/health').then((r) => r.json()),
      fetch('/api/observability/slos').then((r) => r.json()).catch(() => []),
      fetch('/api/observability/metrics').then((r) => r.json()).catch(() => null),
    ]).then(([h, s, m]) => {
      setHealth(h)
      setSlos(Array.isArray(s) ? s : s.data ?? [])
      setMetrics(m)
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">System Health</h1>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform infrastructure status</p>
      </div>

      {error && <Card><CardContent className="p-4"><p className="text-destructive text-sm">{error}</p></CardContent></Card>}

      {health && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Health Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={health.status === 'ok' ? 'active' : 'error'} label={health.status === 'ok' ? 'Operational' : 'Error'} />
              <span className="text-xs text-muted-foreground">v{health.version} — Phase {health.phase}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-md border">
                <div className="text-sm font-medium">Database</div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={health.checks.database.status === 'ok' ? 'active' : 'error'} label={health.checks.database.status} />
                  <span className="text-xs text-muted-foreground">{health.checks.database.latency_ms}ms</span>
                </div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-sm font-medium">API</div>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={health.checks.api.status === 'ok' ? 'active' : 'error'} label={health.checks.api.status} />
                  <span className="text-xs text-muted-foreground">{health.checks.api.latency_ms}ms</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Last checked: {new Date(health.timestamp).toLocaleString()}</p>
          </CardContent>
        </Card>
      )}

      {slos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SLOs</CardTitle>
            <CardDescription>Service Level Objectives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {slos.map((slo) => (
              <div key={slo.name} className="flex items-center gap-4 text-sm">
                <span className="w-40 font-medium truncate">{slo.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${slo.availability >= slo.target ? 'bg-green-500' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(slo.availability, 100)}%` }}
                  />
                </div>
                <span className="w-20 text-right">{slo.availability.toFixed(2)}%</span>
                <span className="w-16 text-right text-xs text-muted-foreground">/ {slo.target}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}