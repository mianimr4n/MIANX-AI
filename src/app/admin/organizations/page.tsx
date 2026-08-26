'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/composite/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDebouncedCallback } from 'use-debounce'

type Org = {
  id: string; name: string; slug: string; status: string; timezone: string; locale: string;
  currency: string; createdAt: string;
  _count: { memberships: number; teams: number; auditLogs: number }
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 25

  const fetchOrgs = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/organizations?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setOrgs(json.data || [])
      setTotal(json.meta?.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetchOrgs(page, search) }, [page, search, fetchOrgs])

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, 400)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total organizations</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text" placeholder="Search organizations..."
          className="w-full pl-9 pr-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => debouncedSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : error ? (
        <Card><CardContent className="p-6"><p className="text-destructive">{error}</p></CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Members</th>
                    <th className="p-3 font-medium">Teams</th>
                    <th className="p-3 font-medium">Created</th>
                  </tr></thead>
                  <tbody>
                    {orgs.map((org) => (
                      <tr key={org.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3"><div className="font-medium">{org.name}</div><div className="text-xs text-muted-foreground">/{org.slug}</div></td>
                        <td className="p-3"><StatusBadge status={org.status as 'active' | 'inactive' | 'suspended'} /></td>
                        <td className="p-3">{org._count.memberships}</td>
                        <td className="p-3">{org._count.teams}</td>
                        <td className="p-3 text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {orgs.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No organizations found</td></tr>
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