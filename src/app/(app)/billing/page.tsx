'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState } from 'react'
import { CreditCard, Receipt, Zap, TrendingUp } from 'lucide-react'

export default function BillingPage() {
  const { activeOrganization } = useOrganization()
  const [plans, setPlans] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
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
        const [planRes, subRes, invRes] = await Promise.allSettled([
          fetch('/api/billing/plans', { headers }).then((r) => r.json()),
          fetch('/api/billing/subscriptions', { headers }).then((r) => r.json()),
          fetch('/api/billing/invoices', { headers }).then((r) => r.json()),
        ])
        if (planRes.status === 'fulfilled' && planRes.value) {
          setPlans(Array.isArray(planRes.value) ? planRes.value : (planRes.value.data ?? []))
        }
        if (subRes.status === 'fulfilled' && subRes.value) {
          setSubscriptions(Array.isArray(subRes.value) ? subRes.value : (subRes.value.data ?? []))
        }
        if (invRes.status === 'fulfilled' && invRes.value) {
          setInvoices(Array.isArray(invRes.value) ? invRes.value : (invRes.value.data ?? []))
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
        icon={CreditCard}
        title="No Organization Selected"
        description="Select an organization to view billing information."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description={`Plans, subscriptions, and usage for ${activeOrganization.name}.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Active Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{plans.filter((p: any) => p.status === 'active').length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{subscriptions.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{invoices.length}</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="Billing Dashboard"
          description="Billing features will be available once plans are configured. Manage subscriptions and view invoices here."
        />
      )}
    </div>
  )
}
