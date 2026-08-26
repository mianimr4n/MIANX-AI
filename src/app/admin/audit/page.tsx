'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

type AuditLog = {
  id: string
  action: string
  resourceType: string
  resourceId: string | null
  metadata: string | null
  createdAt: string
  organization: { name: string } | null
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 50

  const fetchLogs = useCallback(async (p: number, action: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (action) params.set('action', action)
      const res = await fetch(`/api/admin/audit?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLogs(json.data || [])
      setTotal(json.meta?.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetchLogs(page, actionFilter) }, [page, actionFilter, fetchLogs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total events</p>
      </div>

      <div className="relative max-w-sm">
        <input
          type="text" placeholder="Filter by action (e.g. authorization)..."
          className="w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
        />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : error ? (
        <Card><CardContent className="p-6"><p className="text-destructive">{error}</p></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Time</th>
                    <th className="p-3 font-medium">Org</th>
                    <th className="p-3 font-medium">Action</th>
                    <th className="p-3 font-medium">Resource</th>
                  </tr></thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-xs">{log.organization?.name || '—'}</td>
                        <td className="p-3 font-medium text-xs">{log.action}</td>
                        <td className="p-3 text-xs text-muted-foreground">{log.resourceType}{log.resourceId ? `:${log.resourceId.slice(0, 8)}` : ''}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No audit events found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {total > limit && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground self-center">Page {page} of {Math.ceil(total / limit)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}