'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState } from 'react'
import { Workflow, Play, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function AutomationsPage() {
  const { activeOrganization } = useOrganization()
  const [workflows, setWorkflows] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
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
        const [wfRes, jobRes] = await Promise.allSettled([
          fetch('/api/workflows', { headers }).then((r) => r.json()),
          fetch('/api/jobs', { headers }).then((r) => r.json()),
        ])
        if (wfRes.status === 'fulfilled' && wfRes.value) {
          setWorkflows(Array.isArray(wfRes.value) ? wfRes.value : (wfRes.value.data ?? []))
        }
        if (jobRes.status === 'fulfilled' && jobRes.value) {
          setJobs(Array.isArray(jobRes.value) ? jobRes.value : (jobRes.value.data ?? []))
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeOrganization])

  if (!activeOrganization) {
    return (
      <EmptyState
        icon={Workflow}
        title="No Organization Selected"
        description="Select an organization to manage automations."
      />
    )
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'running': return <Play className="h-4 w-4 text-blue-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Workflows, jobs, and event-driven automation for your organization."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{workflows.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{jobs.filter((j: any) => j.status === 'running' || j.status === 'pending').length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{jobs.filter((j: any) => j.status === 'completed').length}</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : workflows.length === 0 && jobs.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No Automations Yet"
          description="Create workflows and automate business processes. Configure via the API or use the AI assistant."
        />
      ) : (
        <>
          {workflows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflows.slice(0, 10).map((wf: any) => (
                    <div key={wf.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Workflow className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{wf.name || wf.id}</span>
                          {wf.description && <span className="text-xs text-muted-foreground">{wf.description}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{wf.status || 'draft'}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
