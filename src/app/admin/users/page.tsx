'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDebouncedCallback } from 'use-debounce'

type User = { id: string; userId: string; displayName: string | null; createdAt: string; _count: { memberships: number } }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 25

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) })
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setUsers(json.data || [])
      setTotal(json.meta?.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetchUsers(page, search) }, [page, search, fetchUsers])

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, 400)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total users</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text" placeholder="Search users by ID..."
          className="w-full pl-9 pr-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => debouncedSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : error ? (
        <Card><CardContent className="p-6"><p className="text-destructive">{error}</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Organizations</th>
                  <th className="p-3 font-medium">Joined</th>
                </tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{u.displayName || u.userId}</td>
                      <td className="p-3">{u._count.memberships}</td>
                      <td className="p-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No users found</td></tr>
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