'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { StatusBadge } from '@/components/composite/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { Bird, Plus, Loader2, X, ChevronLeft, Wheat, Syringe, Egg, Skull } from 'lucide-react'
import { toast } from 'sonner'

type Flock = {
  id: string; breed: string; quantity: number; currentCount: number; status: string
  placementDate: string; averageWeight?: number | null; notes?: string | null
  shed: { name: string; farm: { name: string } }
}
type ShedOption = { id: string; name: string; farm: { name: string } }
type FeedRecord = { id: string; date: string; feedType: string; quantityKg: number; costUsd: number }
type HealthRecord = { id: string; date: string; type: string; treatment: string; costUsd: number; nextDueDate?: string | null }
type ProductionRecord = { id: string; date: string; eggsCollected: number; totalWeightKg: number; feedConversionRatio?: number | null }

const flockStatusMap: Record<string, 'active' | 'pending' | 'warning' | 'inactive'> = {
  placed: 'pending', growing: 'active', laying: 'active', molting: 'warning', depleted: 'inactive', deceased: 'inactive',
}

function orgFetch(orgId: string, url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { 'X-Organization-Id': orgId, 'Content-Type': 'application/json', ...init?.headers } })
}

// Create Flock Dialog
function CreateFlockDialog({ orgId, sheds, onClose, onCreated }: {
  orgId: string; sheds: ShedOption[]; onClose: () => void; onCreated: () => void
}) {
  const [shedId, setShedId] = useState('')
  const [breed, setBreed] = useState('')
  const [placementDate, setPlacementDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shedId || !breed.trim() || !quantity) return
    setSaving(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/poultry/flocks', {
        method: 'POST',
        body: JSON.stringify({ shedId, breed: breed.trim(), placementDate, quantity: Number(quantity), notes: notes.trim() || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to place flock (${res.status})`)
      }
      toast.success('Flock placed')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place flock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">Place New Flock</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Shed</Label>
            <Select value={shedId} onValueChange={setShedId}>
              <SelectTrigger><SelectValue placeholder="Select a shed" /></SelectTrigger>
              <SelectContent>
                {sheds.map((s) => <SelectItem key={s.id} value={s.id}>{s.farm.name} - {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {sheds.length === 0 && <p className="text-xs text-muted-foreground">No sheds yet. Add one from Farms and Sheds first.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="flock-breed">Breed</Label>
            <Input id="flock-breed" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Ross 308" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="flock-date">Placement Date</Label>
              <Input id="flock-date" type="date" value={placementDate} onChange={(e) => setPlacementDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flock-qty">Quantity</Label>
              <Input id="flock-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 2000" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="flock-notes">Notes (optional)</Label>
            <Textarea id="flock-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !shedId || !breed.trim() || !quantity}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {saving ? 'Placing...' : 'Place Flock'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Generic quick-add record form
function QuickAddForm({ fields, onSubmit, submitLabel }: {
  fields: { key: string; label: string; type: 'text' | 'number' | 'date'; required?: boolean; placeholder?: string }[]
  onSubmit: (values: Record<string, string>) => Promise<void>
  submitLabel: string
}) {
  const initial: Record<string, string> = {}
  for (const f of fields) initial[f.key] = f.type === 'date' ? new Date().toISOString().slice(0, 10) : ''
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(values)
      const reset: Record<string, string> = {}
      for (const f of fields) reset[f.key] = f.type === 'date' ? new Date().toISOString().slice(0, 10) : ''
      setValues(reset)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-3 rounded-lg border bg-muted/20">
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          <Input
            type={f.type}
            value={values[f.key]}
            placeholder={f.placeholder}
            required={f.required}
            className="h-8 w-32"
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <Button type="submit" size="sm" className="h-8" disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {submitLabel}
      </Button>
    </form>
  )
}

// Flock Detail Panel
function FlockDetail({ orgId, flock, onBack, onMortalityRecorded }: {
  orgId: string; flock: Flock; onBack: () => void; onMortalityRecorded: () => void
}) {
  const [feed, setFeed] = useState<FeedRecord[]>([])
  const [health, setHealth] = useState<HealthRecord[]>([])
  const [production, setProduction] = useState<ProductionRecord[]>([])
  const [tabLoading, setTabLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setTabLoading(true)
    try {
      const [feedRes, healthRes, prodRes] = await Promise.all([
        orgFetch(orgId, `/api/poultry/feed?flockId=${flock.id}`),
        orgFetch(orgId, `/api/poultry/health?flockId=${flock.id}`),
        orgFetch(orgId, `/api/poultry/production?flockId=${flock.id}`),
      ])
      setFeed((await feedRes.json()).data || [])
      setHealth((await healthRes.json()).data || [])
      setProduction((await prodRes.json()).data || [])
    } catch {
      toast.error('Failed to load flock records')
    } finally {
      setTabLoading(false)
    }
  }, [orgId, flock.id])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchAll() }, [fetchAll])

  const addFeed = async (v: Record<string, string>) => {
    const res = await orgFetch(orgId, '/api/poultry/feed', {
      method: 'POST',
      body: JSON.stringify({ flockId: flock.id, date: v.date, feedType: v.feedType, quantityKg: Number(v.quantityKg), costUsd: v.costUsd ? Number(v.costUsd) : undefined }),
    })
    if (!res.ok) { toast.error('Failed to add feed record'); return }
    toast.success('Feed record added')
    fetchAll()
  }

  const addHealth = async (v: Record<string, string>) => {
    const res = await orgFetch(orgId, '/api/poultry/health', {
      method: 'POST',
      body: JSON.stringify({ flockId: flock.id, date: v.date, type: v.type || 'checkup', treatment: v.treatment, costUsd: v.costUsd ? Number(v.costUsd) : undefined }),
    })
    if (!res.ok) { toast.error('Failed to add health record'); return }
    toast.success('Health record added')
    fetchAll()
  }

  const addProduction = async (v: Record<string, string>) => {
    const res = await orgFetch(orgId, '/api/poultry/production', {
      method: 'POST',
      body: JSON.stringify({ flockId: flock.id, date: v.date, eggsCollected: v.eggsCollected ? Number(v.eggsCollected) : undefined, totalWeightKg: v.totalWeightKg ? Number(v.totalWeightKg) : undefined }),
    })
    if (!res.ok) { toast.error('Failed to add production record'); return }
    toast.success('Production record added')
    fetchAll()
  }

  const recordMortality = async (v: Record<string, string>) => {
    if (!v.count || !v.cause) { toast.error('Count and cause are required'); return }
    const res = await orgFetch(orgId, '/api/poultry/flocks', {
      method: 'POST',
      body: JSON.stringify({ _action: 'record_mortality', flockId: flock.id, date: v.date, count: Number(v.count), cause: v.cause }),
    })
    if (!res.ok) { toast.error('Failed to record mortality'); return }
    toast.success('Mortality recorded')
    onMortalityRecorded()
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" /> Back to Flocks</Button>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-h3">{flock.breed}</h3>
            <p className="text-sm text-muted-foreground">{flock.shed.farm.name} - {flock.shed.name} - Placed {new Date(flock.placementDate).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><p className="text-lg font-bold">{flock.currentCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">of {flock.quantity.toLocaleString()} placed</p></div>
            <StatusBadge status={flockStatusMap[flock.status] ?? 'inactive'} label={flock.status} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed"><Wheat className="h-3.5 w-3.5 mr-1" /> Feed</TabsTrigger>
          <TabsTrigger value="health"><Syringe className="h-3.5 w-3.5 mr-1" /> Health</TabsTrigger>
          <TabsTrigger value="production"><Egg className="h-3.5 w-3.5 mr-1" /> Production</TabsTrigger>
          <TabsTrigger value="mortality"><Skull className="h-3.5 w-3.5 mr-1" /> Mortality</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-3">
          <QuickAddForm submitLabel="Add" onSubmit={addFeed} fields={[
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'feedType', label: 'Feed Type', type: 'text', required: true, placeholder: 'Starter' },
            { key: 'quantityKg', label: 'Qty (kg)', type: 'number', required: true },
            { key: 'costUsd', label: 'Cost ($)', type: 'number' },
          ]} />
          {tabLoading ? <Skeleton className="h-20 w-full" /> : feed.length === 0 ? (
            <EmptyState icon={Wheat} title="No Feed Records" description="Log feed usage above." className="py-6" />
          ) : (
            <div className="space-y-2">
              {feed.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <span>{new Date(r.date).toLocaleDateString()} - {r.feedType}</span>
                  <span className="text-muted-foreground">{r.quantityKg} kg - ${r.costUsd}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-3">
          <QuickAddForm submitLabel="Add" onSubmit={addHealth} fields={[
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'type', label: 'Type', type: 'text', placeholder: 'vaccination' },
            { key: 'treatment', label: 'Treatment', type: 'text', required: true },
            { key: 'costUsd', label: 'Cost ($)', type: 'number' },
          ]} />
          {tabLoading ? <Skeleton className="h-20 w-full" /> : health.length === 0 ? (
            <EmptyState icon={Syringe} title="No Health Records" description="Log vaccinations and treatments above." className="py-6" />
          ) : (
            <div className="space-y-2">
              {health.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <span>{new Date(r.date).toLocaleDateString()} - {r.treatment}</span>
                  <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="production" className="space-y-3">
          <QuickAddForm submitLabel="Add" onSubmit={addProduction} fields={[
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'eggsCollected', label: 'Eggs', type: 'number' },
            { key: 'totalWeightKg', label: 'Weight (kg)', type: 'number' },
          ]} />
          {tabLoading ? <Skeleton className="h-20 w-full" /> : production.length === 0 ? (
            <EmptyState icon={Egg} title="No Production Records" description="Log daily production above." className="py-6" />
          ) : (
            <div className="space-y-2">
              {production.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <span>{new Date(r.date).toLocaleDateString()}</span>
                  <span className="text-muted-foreground">{r.eggsCollected} eggs - {r.totalWeightKg} kg</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mortality" className="space-y-3">
          <QuickAddForm submitLabel="Record" onSubmit={recordMortality} fields={[
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'count', label: 'Count', type: 'number', required: true },
            { key: 'cause', label: 'Cause', type: 'text', required: true, placeholder: 'Heat stress' },
          ]} />
          <p className="text-xs text-muted-foreground">Recording mortality reduces this flock&apos;s current bird count.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function PoultryFlocksPage() {
  const { activeOrganization } = useOrganization()
  const [flocks, setFlocks] = useState<Flock[]>([])
  const [sheds, setSheds] = useState<ShedOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedFlockId, setSelectedFlockId] = useState<string | null>(null)

  const fetchFlocks = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    setLoading(true)
    try {
      const [flocksRes, shedsRes] = await Promise.all([
        orgFetch(activeOrganization.id, '/api/poultry/flocks'),
        orgFetch(activeOrganization.id, '/api/poultry/sheds'),
      ])
      if (!flocksRes.ok) throw new Error(`Failed to load flocks (${flocksRes.status})`)
      setFlocks((await flocksRes.json()).data || [])
      setSheds((await shedsRes.json()).data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flocks')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchFlocks() }, [fetchFlocks])

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchFlocks() }} />
  if (!activeOrganization) {
    return <EmptyState icon={Bird} title="No Organization Selected" description="Select an organization to manage flocks." />
  }

  const selectedFlock = flocks.find((f) => f.id === selectedFlockId)
  if (selectedFlock) {
    return (
      <FlockDetail
        orgId={activeOrganization.id}
        flock={selectedFlock}
        onBack={() => setSelectedFlockId(null)}
        onMortalityRecorded={() => { fetchFlocks() }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flocks"
        description="Track flocks across every shed: feed, health, production, and mortality."
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Place Flock</Button>}
      />

      {createOpen && (
        <CreateFlockDialog orgId={activeOrganization.id} sheds={sheds} onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); fetchFlocks() }} />
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : flocks.length === 0 ? (
        <EmptyState icon={Bird} title="No Flocks Yet" description="Place your first flock in a shed to start tracking it."
          action={{ label: 'Place Flock', onClick: () => setCreateOpen(true) }} />
      ) : (
        <div className="space-y-2">
          {flocks.map((flock) => (
            <button key={flock.id} className="w-full text-left" onClick={() => setSelectedFlockId(flock.id)}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><Bird className="h-4 w-4 text-muted-foreground" /></div>
                    <div>
                      <span className="text-sm font-medium">{flock.breed}</span>
                      <p className="text-xs text-muted-foreground">{flock.shed.farm.name} - {flock.shed.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{flock.currentCount.toLocaleString()} birds</span>
                    <StatusBadge status={flockStatusMap[flock.status] ?? 'inactive'} label={flock.status} />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
