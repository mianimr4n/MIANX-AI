'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { KPICard } from '@/components/composite/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Warehouse, Bird, Skull, DollarSign, Wheat,
  Syringe, ArrowRight,
} from 'lucide-react'

type DashboardData = {
  farms: { total: number; sheds: number; activeFlocks: number; totalBirds: number }
  recentFlocks: {
    id: string; breed: string; currentCount: number; status: string
    shed: { name: string; farm: { name: string } }
  }[]
  todayMortality: number
  weeklySales: { count: number; revenue: number }
  monthlyFeed: { costUsd: number; quantityKg: number }
  upcomingVaccinations: {
    id: string; nextDueDate: string; treatment: string
    flock: { id: string; breed: string }
  }[]
}

function orgFetch(orgId: string, url: string) {
  return fetch(url, { headers: { 'X-Organization-Id': orgId } })
}

const flockStatusVariant: Record<string, 'active' | 'pending' | 'warning' | 'inactive'> = {
  placed: 'pending',
  growing: 'active',
  laying: 'active',
  molting: 'warning',
  depleted: 'inactive',
  deceased: 'inactive',
}

export default function PoultryDashboardPage() {
  const { activeOrganization } = useOrganization()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await orgFetch(activeOrganization.id, '/api/poultry/dashboard')
      if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`)
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchDashboard() }} />
  if (!activeOrganization) {
    return <EmptyState icon={Building2} title="No Organization Selected" description="Select an organization to view its Poultry OS dashboard." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Poultry OS"
        description={`Farm, flock, and sales overview for ${activeOrganization.name}.`}
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link href="/app/business/poultry/farms">Farms</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/app/business/poultry/flocks">Flocks</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/app/business/poultry/sales">Sales</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/app/business/poultry/procurement">Procurement</Link></Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Farms" value={data?.farms.total ?? 0} icon={Building2} description={`${data?.farms.sheds ?? 0} sheds`} />
          <KPICard title="Active Flocks" value={data?.farms.activeFlocks ?? 0} icon={Bird} description={`${(data?.farms.totalBirds ?? 0).toLocaleString()} birds`} />
          <KPICard title="Mortality Today" value={data?.todayMortality ?? 0} icon={Skull} description="Birds lost today" />
          <KPICard title="Sales (7d)" value={`$${(data?.weeklySales.revenue ?? 0).toLocaleString()}`} icon={DollarSign} description={`${data?.weeklySales.count ?? 0} completed sales`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Bird className="h-4 w-4" /> Recent Flocks</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link href="/app/business/poultry/flocks">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : !data?.recentFlocks.length ? (
              <EmptyState icon={Bird} title="No Active Flocks" description="Place a flock in a shed to start tracking it." />
            ) : (
              <div className="space-y-2">
                {data.recentFlocks.map((flock) => (
                  <div key={flock.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <span className="text-sm font-medium">{flock.breed}</span>
                      <p className="text-xs text-muted-foreground">{flock.shed.farm.name} &middot; {flock.shed.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{flock.currentCount.toLocaleString()} birds</span>
                      <Badge variant="outline" className="capitalize">{flockStatusVariant[flock.status] ? flock.status : flock.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4" /> Upcoming Vaccinations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : !data?.upcomingVaccinations.length ? (
              <EmptyState icon={Syringe} title="Nothing Scheduled" description="No upcoming vaccinations on record." />
            ) : (
              <div className="space-y-2">
                {data.upcomingVaccinations.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <span className="text-sm font-medium">{v.treatment}</span>
                      <p className="text-xs text-muted-foreground">{v.flock.breed}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(v.nextDueDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Wheat className="h-4 w-4" /> Feed Costs This Month</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-8 w-40" /> : (
            <div className="flex items-center gap-6">
              <div><p className="text-2xl font-bold">${(data?.monthlyFeed.costUsd ?? 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total cost</p></div>
              <div><p className="text-2xl font-bold">{(data?.monthlyFeed.quantityKg ?? 0).toLocaleString()} kg</p><p className="text-xs text-muted-foreground">Feed used</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
