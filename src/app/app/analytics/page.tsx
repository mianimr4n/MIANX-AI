'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { BarChart3, Activity, FileText, Users, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Types ──────────────────────────────────────────────
type AuditLog = {
  id: string; action: string; resourceType: string | null; resourceId: string | null
  actorId: string | null; ipAddress: string | null; userAgent: string | null; createdAt: string
}

function orgFetch(orgId: string, url: string) {
  return fetch(url, { headers: { 'X-Organization-Id': orgId } })
}

// ── Main Page ─────────────────────────────────────────
export default function AnalyticsPage() {
  const { activeOrganization } = useOrganization()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const PAGE_SIZE = 20

  const fetchLogs = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (actionFilter !== 'all') params.set('action', actionFilter)
      const res = await orgFetch(activeOrganization.id, `/api/audit-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      const json = await res.json()
      setLogs(json?.data ?? json?.items ?? json ?? [])
      setTotal(json?.meta?.total ?? json?.total ?? logs.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization, page, actionFilter])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Extract unique actions for filter
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchLogs() }} />
  if (!activeOrganization) {
    return <EmptyState icon={BarChart3} title="No Organization Selected" description="Select an organization to view analytics." />
  }

  const filteredLogs = actionFilter === 'all' ? logs : logs.filter((l) => l.action === actionFilter)

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description={`Organization activity and audit logs for ${activeOrganization.name}.`} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Total Events</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{total}</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Members</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeOrganization._count.memberships}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Audit Records</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Action Types</CardTitle></CardHeader>
          <CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{uniqueActions.length}</p>}</CardContent>
        </Card>
      </div>

      {/* Action Type Breakdown */}
      {uniqueActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Event Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {uniqueActions.map((action) => {
                const count = logs.filter((l) => l.action === action).length
                return <Badge key={action} variant="outline" className="text-xs">{action} ({count})</Badge>
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Audit Log</CardTitle>
            {uniqueActions.length > 0 && (
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filter by action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <CardDescription>{total} total events recorded</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState icon={FileText} title="No Audit Events" description="Events will appear as your organization uses the platform." />
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <div className="hidden md:grid grid-cols-[1fr_120px_100px_140px] gap-px bg-border text-xs font-medium text-muted-foreground p-3">
                  <span>Event</span><span>Actor</span><span>Resource</span><span>Timestamp</span>
                </div>
                <div className="divide-y">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_140px] gap-1 md:gap-px p-3 hover:bg-muted/50 transition-colors">
                      <div>
                        <Badge variant="outline" className="text-xs mr-2">{log.action}</Badge>
                        <span className="text-sm text-muted-foreground hidden md:inline">{log.id.slice(0, 8)}...</span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{log.actorId?.slice(0, 12) || 'system'}</span>
                      <span className="text-xs text-muted-foreground truncate">{log.resourceType || '-'}</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}