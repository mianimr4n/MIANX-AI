'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/composite/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, FileText, Users } from 'lucide-react'

type RevenueData = {
  subscriptions: { total: number; active: number }
  invoices: { total: number; paid: number }
  plans: Array<{ id: string; name: string; price: number; interval: string; _count: { subscriptions: number } }>
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Revenue</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Revenue</h1>
        <Card><CardContent className="p-6"><p className="text-destructive">Failed to load revenue data: {error}</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-sm text-muted-foreground mt-1">Subscription and billing metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Subscriptions" value={data.subscriptions.total} icon={Users} description="All time" />
        <KPICard title="Active Subscriptions" value={data.subscriptions.active} icon={CreditCard} description="Currently active" />
        <KPICard title="Total Invoices" value={data.invoices.total} icon={FileText} description="All invoices" />
        <KPICard title="Paid Invoices" value={data.invoices.paid} icon={FileText} description="Successfully paid" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plans</CardTitle>
          <CardDescription>Subscription distribution by plan</CardDescription>
        </CardHeader>
        <CardContent>
          {data.plans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Plan</th>
                  <th className="p-3 font-medium">Price</th>
                  <th className="p-3 font-medium">Interval</th>
                  <th className="p-3 font-medium">Subscribers</th>
                </tr></thead>
                <tbody>
                  {data.plans.map((plan) => (
                    <tr key={plan.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{plan.name}</td>
                      <td className="p-3">${plan.price}</td>
                      <td className="p-3">{plan.interval}</td>
                      <td className="p-3">{plan._count.subscriptions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No plans configured yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}