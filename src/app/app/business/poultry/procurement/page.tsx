'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { KPICard } from '@/components/composite/kpi-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { Truck, Plus, Loader2, X, DollarSign, Package } from 'lucide-react'
import { toast } from 'sonner'

type Procurement = {
  id: string; type: string; supplier: string; description: string
  quantity: number; unit: string; totalCostUsd: number; date: string; status: string
}

function orgFetch(orgId: string, url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { 'X-Organization-Id': orgId, 'Content-Type': 'application/json', ...init?.headers } })
}

function CreateProcurementDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState('feed')
  const [supplier, setSupplier] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [unitCostUsd, setUnitCostUsd] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplier.trim() || !description.trim() || !quantity) return
    setSaving(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/poultry/procurement', {
        method: 'POST',
        body: JSON.stringify({
          type, supplier: supplier.trim(), description: description.trim(),
          quantity: Number(quantity), unit, unitCostUsd: unitCostUsd ? Number(unitCostUsd) : undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to record procurement (${res.status})`)
      }
      toast.success('Procurement recorded')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record procurement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">New Procurement</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chick">Chick</SelectItem>
                <SelectItem value="feed">Feed</SelectItem>
                <SelectItem value="medicine">Medicine</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="proc-supplier">Supplier</Label>
            <Input id="proc-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proc-desc">Description</Label>
            <Input id="proc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Starter feed, 50kg bags" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="proc-qty">Quantity</Label>
              <Input id="proc-qty" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-unit">Unit</Label>
              <Input id="proc-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proc-cost">Unit Cost ($)</Label>
              <Input id="proc-cost" type="number" min={0} step="0.01" value={unitCostUsd} onChange={(e) => setUnitCostUsd(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !supplier.trim() || !description.trim() || !quantity}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {saving ? 'Saving...' : 'Record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PoultryProcurementPage() {
  const { activeOrganization } = useOrganization()
  const [records, setRecords] = useState<Procurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchRecords = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await orgFetch(activeOrganization.id, '/api/poultry/procurement')
      if (!res.ok) throw new Error(`Failed to load procurement records (${res.status})`)
      const json = await res.json()
      setRecords(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load procurement records')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchRecords() }, [fetchRecords])

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchRecords() }} />
  if (!activeOrganization) {
    return <EmptyState icon={Truck} title="No Organization Selected" description="Select an organization to manage procurement." />
  }

  const totalSpend = records.reduce((sum, r) => sum + r.totalCostUsd, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Track chicks, feed, medicine, equipment, and supply purchases."
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Purchase</Button>}
      />

      {createOpen && <CreateProcurementDialog orgId={activeOrganization.id} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchRecords() }} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KPICard title="Total Spend" value={`$${totalSpend.toLocaleString()}`} icon={DollarSign} />
          <KPICard title="Purchases Recorded" value={records.length} icon={Package} />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Truck} title="No Purchases Recorded" description="Log your first procurement to track farm expenses."
          action={{ label: 'New Purchase', onClick: () => setCreateOpen(true) }} />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.description}</span>
                    <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.supplier} &middot; {new Date(r.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${r.totalCostUsd.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{r.quantity} {r.unit}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
