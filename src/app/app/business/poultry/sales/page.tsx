'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { StatusBadge } from '@/components/composite/status-badge'
import { KPICard } from '@/components/composite/kpi-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { DollarSign, Users, Plus, Loader2, X, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

type Sale = {
  id: string; date: string; totalAmount: number; currency: string; status: string; items: string
  customer?: { name: string } | null
}
type Customer = { id: string; name: string; phone?: string | null; email?: string | null }

const saleStatusMap: Record<string, 'active' | 'pending' | 'inactive'> = {
  completed: 'active', pending: 'pending', cancelled: 'inactive',
}

function orgFetch(orgId: string, url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { 'X-Organization-Id': orgId, 'Content-Type': 'application/json', ...init?.headers } })
}

function CreateSaleDialog({ orgId, customers, onClose, onCreated }: {
  orgId: string; customers: Customer[]; onClose: () => void; onCreated: () => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !totalAmount) return
    setSaving(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/poultry/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customerId || undefined,
          items: { description: description.trim() },
          totalAmount: Number(totalAmount),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to record sale (${res.status})`)
      }
      toast.success('Sale recorded')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">New Sale</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Customer (optional)</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Walk-in / none" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-desc">What was sold</Label>
            <Textarea id="sale-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 200 broilers, avg 2.1kg" rows={2} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-amount">Total Amount ($)</Label>
            <Input id="sale-amount" type="number" min={0} step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !description.trim() || !totalAmount}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {saving ? 'Saving...' : 'Record Sale'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateCustomerDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/poultry/customers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to add customer (${res.status})`)
      }
      toast.success('Customer added')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">New Customer</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cust-name">Name</Label>
            <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-phone">Phone (optional)</Label>
            <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-email">Email (optional)</Label>
            <Input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {saving ? 'Adding...' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PoultrySalesPage() {
  const { activeOrganization } = useOrganization()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saleOpen, setSaleOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    setLoading(true)
    try {
      const [salesRes, customersRes] = await Promise.all([
        orgFetch(activeOrganization.id, '/api/poultry/sales'),
        orgFetch(activeOrganization.id, '/api/poultry/customers'),
      ])
      if (!salesRes.ok) throw new Error(`Failed to load sales (${salesRes.status})`)
      setSales((await salesRes.json()).data || [])
      setCustomers((await customersRes.json()).data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchAll() }, [fetchAll])

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchAll() }} />
  if (!activeOrganization) {
    return <EmptyState icon={ShoppingCart} title="No Organization Selected" description="Select an organization to manage sales." />
  }

  const totalRevenue = sales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Record sales and manage customers."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCustomerOpen(true)}><Users className="h-4 w-4 mr-1" /> Add Customer</Button>
            <Button size="sm" onClick={() => setSaleOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Sale</Button>
          </div>
        }
      />

      {saleOpen && <CreateSaleDialog orgId={activeOrganization.id} customers={customers} onClose={() => setSaleOpen(false)} onCreated={() => { setSaleOpen(false); fetchAll() }} />}
      {customerOpen && <CreateCustomerDialog orgId={activeOrganization.id} onClose={() => setCustomerOpen(false)} onCreated={() => { setCustomerOpen(false); fetchAll() }} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} description="Completed sales" />
          <KPICard title="Sales Recorded" value={sales.length} icon={ShoppingCart} />
          <KPICard title="Customers" value={customers.length} icon={Users} />
        </div>
      )}

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
          <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          {loading ? (
            <div className="space-y-2 mt-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : sales.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No Sales Yet" description="Record your first sale to start tracking revenue."
              action={{ label: 'New Sale', onClick: () => setSaleOpen(true) }} />
          ) : (
            <div className="space-y-2 mt-3">
              {sales.map((sale) => {
                let itemsText = ''
                try { itemsText = JSON.parse(sale.items).description || '' } catch { itemsText = '' }
                return (
                  <Card key={sale.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{itemsText || 'Sale'}</span>
                        <p className="text-xs text-muted-foreground">
                          {sale.customer?.name || 'Walk-in'} &middot; {new Date(sale.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">${sale.totalAmount.toLocaleString()}</span>
                        <StatusBadge status={saleStatusMap[sale.status] ?? 'inactive'} label={sale.status} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers">
          {loading ? (
            <div className="space-y-2 mt-3"><Skeleton className="h-14 w-full" /></div>
          ) : customers.length === 0 ? (
            <EmptyState icon={Users} title="No Customers Yet" description="Add customers to link them to sales."
              action={{ label: 'Add Customer', onClick: () => setCustomerOpen(true) }} />
          ) : (
            <div className="space-y-2 mt-3">
              {customers.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <span className="text-sm font-medium">{c.name}</span>
                    <p className="text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' \u00b7 ') || 'No contact info'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
