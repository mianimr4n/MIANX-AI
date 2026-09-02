'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { CreditCard, Receipt, Zap, TrendingUp, Check, Loader2, ArrowUpRight, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type FeatureItem = { name: string; key: string; description?: string | null; type: string }
type PlanData = {
  id: string; name: string; slug?: string; basePrice?: number; status: string; billingCycle?: string
  versions?: { id: string; version: number; status: string; features: string | FeatureItem[] }[]
}

type SubscriptionData = {
  id: string; state: string; currentPeriodStart: string; currentPeriodEnd: string
  plan?: { name: string } | null
  planVersion?: { plan?: { name: string } | null; version: number } | null
}

type InvoiceData = {
  id: string; status: string; total: number; currency: string; dueAt?: string | null; createdAt: string
}

type UsageData = {
  meters?: Array<{ meterKey: string; meter: { name: string; unit: string; defaultLimit?: number | null }; current: number; limit: number }>
  aiBudget?: { tokensUsed: number; tokensLimit: number; requestsUsed: number; requestsLimit: number; costMilliUsd: number; budgetMilliUsd: number }
}

function orgFetch(orgId: string, url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { 'X-Organization-Id': orgId, 'Content-Type': 'application/json', ...init?.headers } })
}

function unwrap<T>(res: Response): Promise<T> { return res.json().then((j) => j?.data ?? j) }

function PlanCard({ plan, isCurrent, onSelect }: {
  plan: PlanData; isCurrent: boolean; onSelect: (planId: string, versionId: string, planSlug: string, basePrice: number) => void
}) {
  const latestVersion = plan.versions?.[0]
  if (!latestVersion) return null
  const monthlyPrice = Number(plan.basePrice ?? 0)
  let features: FeatureItem[] = []
  try {
    const raw = latestVersion.features
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw)
      features = Array.isArray(parsed) ? parsed.map((f: any) => f.feature ?? f) : []
    } else if (Array.isArray(raw)) features = raw.map((f: any) => f.feature ?? f)
  } catch { /* skip malformed feature metadata */ }

  return (
    <Card className={`relative flex flex-col ${isCurrent ? 'border-primary shadow-sm' : ''}`}>
      {isCurrent && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2"><Badge className="text-xs">Current Plan</Badge></div>}
      <CardHeader className="pb-2 pt-6"><CardTitle className="text-lg">{plan.name}</CardTitle><CardDescription>{plan.billingCycle === 'yearly' ? 'Annual billing' : 'Monthly billing'}</CardDescription></CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="mb-4"><span className="text-3xl font-bold">{monthlyPrice === 0 ? 'Free' : `$${monthlyPrice.toFixed(2)}`}</span>{monthlyPrice > 0 && <span className="text-sm text-muted-foreground">/month</span>}</div>
        {features.length > 0 && <ul className="space-y-1.5 flex-1 mb-4">{features.slice(0, 8).map((f) => <li key={f.key} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-success shrink-0 mt-0.5" /><span>{f.name}</span></li>)}</ul>}
        {!isCurrent && monthlyPrice > 0 && <Button className="w-full" variant="outline" onClick={() => onSelect(plan.id, latestVersion.id, plan.slug ?? '', monthlyPrice)} disabled={false}><ArrowUpRight className="h-4 w-4 mr-1" /> Upgrade</Button>}
      </CardContent>
    </Card>
  )
}

export default function BillingPage() {
  const { activeOrganization } = useOrganization()
  const [plans, setPlans] = useState<PlanData[]>([])
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    const orgId = activeOrganization.id
    try {
      const [planRes, subRes, invRes, usageRes] = await Promise.allSettled([
        orgFetch(orgId, '/api/billing/plans?system=true').then((r) => r.ok ? unwrap<PlanData[]>(r) : []),
        orgFetch(orgId, '/api/billing/subscriptions').then((r) => r.ok ? unwrap<SubscriptionData | SubscriptionData[]>(r) : null),
        orgFetch(orgId, '/api/billing/invoices').then((r) => r.ok ? unwrap<InvoiceData[]>(r) : []),
        orgFetch(orgId, '/api/billing/usage').then((r) => r.ok ? unwrap<UsageData>(r) : null),
      ])
      if (planRes.status === 'fulfilled') setPlans(Array.isArray(planRes.value) ? planRes.value : [])
      if (subRes.status === 'fulfilled' && subRes.value) { const v = subRes.value; setSubscription(Array.isArray(v) ? v[0] ?? null : v) }
      if (invRes.status === 'fulfilled') setInvoices(Array.isArray(invRes.value) ? invRes.value : [])
      if (usageRes.status === 'fulfilled') setUsage(usageRes.value)
    } catch { setError('Failed to load billing data') } finally { setLoading(false) }
  }, [activeOrganization])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleUpgrade = async (_planId: string, versionId: string, planSlug: string, basePrice: number) => {
    if (!activeOrganization || !subscription) return
    setUpgrading(true)
    try {
      if (basePrice === 0) {
        const res = await orgFetch(activeOrganization.id, '/api/billing/subscriptions', { method: 'POST', body: JSON.stringify({ action: 'upgrade', subscriptionId: subscription.id, planVersionId: versionId }) })
        if (!res.ok) throw new Error('Failed to change plan')
        await fetchAll(); return
      }
      const res = await orgFetch(activeOrganization.id, '/api/billing/checkout', { method: 'POST', body: JSON.stringify({ planSlug, billingCycle: 'monthly' }) })
      if (res.ok) {
        const data = await res.json()
        if (data.data?.checkoutUrl) { window.location.href = data.data.checkoutUrl; return }
      }
      throw new Error('Stripe checkout is not available for this plan')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to upgrade plan') } finally { setUpgrading(false) }
  }

  const handleCancel = async () => {
    if (!activeOrganization || !subscription) return
    if (!window.confirm('Cancel this subscription? Access will remain available until the current billing period ends.')) return
    setCancelling(true)
    try {
      const res = await orgFetch(activeOrganization.id, '/api/billing/subscriptions', { method: 'POST', body: JSON.stringify({ action: 'cancel', subscriptionId: subscription.id, immediate: false }) })
      if (!res.ok) throw new Error('Failed to cancel subscription')
      toast.success('Subscription cancellation scheduled')
      await fetchAll()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription') } finally { setCancelling(false) }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); fetchAll() }} />
  if (!activeOrganization) return <EmptyState icon={CreditCard} title="No Organization Selected" description="Select an organization to view billing." />
  const currentPlanName = subscription?.planVersion?.plan?.name ?? subscription?.plan?.name ?? ''

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description={`Plans, subscriptions, and usage for ${activeOrganization.name}.`} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Current Plan</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{currentPlanName || 'Free'}</p>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> AI Cost (MTD)</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">${((usage?.aiBudget?.costMilliUsd ?? 0) / 1000).toFixed(2)}</p>}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Invoices</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{invoices.length}</p>}</CardContent></Card>
      </div>
      <Tabs defaultValue="plans">
        <TabsList><TabsTrigger value="plans">Plans</TabsTrigger><TabsTrigger value="usage">Usage</TabsTrigger><TabsTrigger value="invoices">Invoices</TabsTrigger></TabsList>
        <TabsContent value="plans">
          {loading ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div> : plans.length === 0 ? <EmptyState icon={CreditCard} title="No Plans Available" description="Billing plans have not been configured yet." /> : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} isCurrent={plan.name === currentPlanName} onSelect={handleUpgrade} />)}</div>}
          {subscription && subscription.state === 'active' && <div className="mt-4 flex justify-end"><Button variant="outline" onClick={handleCancel} disabled={cancelling || upgrading}><XCircle className="h-4 w-4 mr-2" />{cancelling ? 'Cancelling…' : 'Cancel subscription'}</Button></div>}
        </TabsContent>
        <TabsContent value="usage"><Card><CardHeader className="pb-3"><CardTitle className="text-base">Usage Meters</CardTitle></CardHeader><CardContent className="space-y-4">{loading ? <Skeleton className="h-40 w-full" /> : usage?.aiBudget ? <><div className="space-y-2"><div className="flex justify-between text-sm"><span>AI Tokens</span><span>{(usage.aiBudget.tokensUsed / 1000).toFixed(0)}k / {(usage.aiBudget.tokensLimit / 1000).toFixed(0)}k</span></div><Progress value={usage.aiBudget.tokensLimit > 0 ? (usage.aiBudget.tokensUsed / usage.aiBudget.tokensLimit) * 100 : 0} /></div><div className="space-y-2"><div className="flex justify-between text-sm"><span>AI Requests</span><span>{usage.aiBudget.requestsUsed} / {usage.aiBudget.requestsLimit}</span></div><Progress value={usage.aiBudget.requestsLimit > 0 ? (usage.aiBudget.requestsUsed / usage.aiBudget.requestsLimit) * 100 : 0} /></div><div className="space-y-2"><div className="flex justify-between text-sm"><span>AI Budget</span><span>${((usage.aiBudget.costMilliUsd ?? 0) / 1000).toFixed(2)} / ${((usage.aiBudget.budgetMilliUsd ?? 0) / 1000).toFixed(2)}</span></div><Progress value={usage.aiBudget.budgetMilliUsd > 0 ? (usage.aiBudget.costMilliUsd / usage.aiBudget.budgetMilliUsd) * 100 : 0} /></div></> : <EmptyState icon={TrendingUp} title="No Usage Data" description="Usage will appear once your organization starts using the platform." />}</CardContent></Card></TabsContent>
        <TabsContent value="invoices"><Card><CardHeader className="pb-3"><CardTitle className="text-base">Invoice History</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-48 w-full" /> : invoices.length === 0 ? <EmptyState icon={Receipt} title="No Invoices" description="Invoices will appear once billing is active." /> : <div className="space-y-2">{invoices.map((inv) => <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"><div className="flex items-center gap-3"><Receipt className="h-4 w-4 text-muted-foreground" /><div><span className="text-sm font-medium">{inv.id.slice(0, 8)}...</span><p className="text-xs text-muted-foreground">Due {inv.dueAt ? new Date(inv.dueAt).toLocaleDateString() : '—'}</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-medium">${Number(inv.total).toFixed(2)}</span><Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : 'outline'} className="text-xs">{inv.status}</Badge></div></div>)}</div>}</CardContent></Card></TabsContent>
      </Tabs>
      {upgrading && <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow"><Loader2 className="h-4 w-4 animate-spin" /> Processing…</div>}
    </div>
  )
}