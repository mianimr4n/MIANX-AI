'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/composite/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDebouncedCallback } from 'use-debounce'

type Domain = {
  id: string; name: string; slug: string; version: string; status: string; description: string | null;
  createdAt: string;
  _count: { organizationDomains: number; modules: number }
}

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 25

  const fetchDomains = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/domains?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setDomains(json.data || [])
      setTotal(json.meta?.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [limit])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchDomains(page, search) }, [page, search, fetchDomains])

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, 400)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Domains</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total domains registered on platform</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text" placeholder="Search domains..."
          className="w-full pl-9 pr-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => debouncedSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : error ? (
        <Card><CardContent className="p-6"><p className="text-destructive">{error}</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Version</th>
                  <th className="p-3 font-medium">Modules</th>
                  <th className="p-3 font-medium">Orgs</th>
                  <th className="p-3 font-medium">Created</th>
                </tr></thead>
                <tbody>
                  {domains.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3"><div className="font-medium">{d.name}</div><div className="text-xs text-muted-foreground">/{d.slug}</div></td>
                      <td className="p-3"><StatusBadge status={d.status as 'active' | 'inactive'} /></td>
                      <td className="p-3">v{d.version}</td>
                      <td className="p-3">{d._count.modules}</td>
                      <td className="p-3">{d._count.organizationDomains}</td>
                      <td className="p-3 text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {domains.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No domains found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}