'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState } from 'react'
import { BarChart3, Activity, FileText, Users, TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
  const { activeOrganization } = useOrganization()
  const [auditData, setAuditData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrganization) {
      setLoading(false)
      return
    }
    const orgId = activeOrganization.id
    async function fetchData() {
      try {
        const headers = { 'X-Organization-Id': orgId }
        const [auditRes, healthRes] = await Promise.allSettled([
          fetch('/api/audit-logs?limit=100', { headers }).then((r) => r.json()),
          fetch('/api/observability/metrics', { headers }).then((r) => r.json()).catch(() => null),
        ])
        if (auditRes.status === 'fulfilled' && auditRes.value) {
          setAuditData(auditRes.value)
        }
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeOrganization])

  if (!activeOrganization) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Organization Selected"
        description="Select an organization to view analytics."
      />
    )
  }

  const totalAudits = auditData?.total ?? auditData?.meta?.total ?? 0
  const auditItems = auditData?.data ?? auditData ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Organization activity and metrics for ${activeOrganization.name}.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{totalAudits}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeOrganization._count.memberships}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeOrganization._count.auditLogs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">--</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Analytics Dashboard"
          description="Detailed charts and metrics will be available once observability data accumulates. Use the API endpoints for programmatic access."
        />
      )}
    </div>
  )
}
