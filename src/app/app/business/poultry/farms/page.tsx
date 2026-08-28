'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { StatusBadge } from '@/components/composite/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { Building2, Warehouse, Plus, Loader2, X, MapPin, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

type Farm = {
  id: string; name: string; location: string; capacity: number
  status: 'active' | 'inactive' | 'under_maintenance'
  contactInfo?: string | null
  _count: { sheds: number }
}

type Shed = {
  id: string; name: string; shedType: string; capacity: number; currentCount: number
  status: string
  _count?: { flocks: number }
}

const farmStatusMap: Record<string, 'active' | 'inactive' | 'warning'> = {
  active: 'active', inactive: 'inactive', under_maintenance: 'warning',
}

function orgFetch(orgId: string, url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { 'X-Organization-Id': orgId, 'Content-Type': 'application/json', ...init?.headers } })
}

// ── Create Farm Dialog ────────────────────────────────
function CreateFarmDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !location.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/poultry/farms', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(), location: location.trim(),
          capacity: capacity ? Number(capacity) : undefined,
          contactInfo: contactInfo.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to create farm (${res.status})`)
      }
      toast.success('Farm created')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create farm')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">New Farm</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="farm-name">Farm Name</Label>
            <Input id="farm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. North Ridge Farm" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm-location">Location</Label>
            <Input id="farm-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Multan, Punjab" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm-capacity">Capacity (birds)</Label>
            <Input id="farm-capacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 10000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="farm-contact">Contact Info (optional)</Label>
            <Input id="farm-contact" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Phone or email" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim() || !location.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {saving ? 'Creating...' : 'Create Farm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Create Shed Dialog ────────────────────────────────
function CreateShedDialog({ orgId, farmId, onClose, onCreated }: {
  orgId: string; farmId: string; onClose: () => void; onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [shedType, setShedType] = useState('broiler')
  const [capacity, setCapacity] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await orgFetch(orgId, '/api/poultry/sheds', {
        method: 'POST',
        body: JSON.stringify({ farmId, name: name.trim(), shedType, capacity: capacity ? Number(capacity) : undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to create shed (${res.status})`)
      }
      toast.success('Shed created')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3">New Shed</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="shed-name">Shed Name</Label>
            <Input id="shed-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shed A" required />
          </div>
          <div className="space-y-2">
            <Label>Shed Type</Label>
            <Select value={shedType} onValueChange={setShedType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="broiler">Broiler</SelectItem>
                <SelectItem value="layer">Layer</SelectItem>
                <SelectItem value="breeder">Breeder</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shed-capacity">Capacity (birds)</Label>
            <Input id="shed-capacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g. 2000" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {saving ? 'Creating...' : 'Create Shed'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PoultryFarmsPage() {
  const { activeOrganization } = useOrganization()
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createFarmOpen, setCreateFarmOpen] = useState(false)
  const [createShedFor, setCreateShedFor] = useState<string | null>(null)
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null)
  const [sheds, setSheds] = useState<Shed[]>([])
  const [shedsLoading, setShedsLoading] = useState(false)

  const fetchFarms = useCallback(async () => {
    if (!activeOrganization) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await orgFetch(activeOrganization.id, '/api/poultry/farms')
      if (!res.ok) throw new Error(`Failed to load farms (${res.status})`)
      const json = await res.json()
      setFarms(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farms')
    } finally {
      setLoading(false)
    }
  }, [activeOrganization])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern: async fetch sets loading/data state, not a synchronous render loop
  useEffect(() => { fetchFarms() }, [fetchFarms])

  const fetchSheds = useCallback(async (farmId: string) => {
    if (!activeOrganization) return
    setShedsLoading(true)
    try {
      const res = await orgFetch(activeOrganization.id, `/api/poultry/sheds?farmId=${farmId}`)
      const json = await res.json()
      setSheds(json.data || [])
    } catch {
      toast.error('Failed to load sheds')
    } finally {
      setShedsLoading(false)
    }
  }, [activeOrganization])

  const handleSelectFarm = (farmId: string) => {
    if (selectedFarm === farmId) { setSelectedFarm(null); return }
    setSelectedFarm(farmId)
    fetchSheds(farmId)
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchFarms() }} />
  if (!activeOrganization) {
    return <EmptyState icon={Building2} title="No Organization Selected" description="Select an organization to manage farms." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farms & Sheds"
        description="Manage your farm locations and their sheds."
        actions={<Button size="sm" onClick={() => setCreateFarmOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Farm</Button>}
      />

      {createFarmOpen && (
        <CreateFarmDialog orgId={activeOrganization.id} onClose={() => setCreateFarmOpen(false)}
          onCreated={() => { setCreateFarmOpen(false); fetchFarms() }} />
      )}
      {createShedFor && (
        <CreateShedDialog orgId={activeOrganization.id} farmId={createShedFor} onClose={() => setCreateShedFor(null)}
          onCreated={() => { fetchSheds(createShedFor); setCreateShedFor(null) }} />
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : farms.length === 0 ? (
        <EmptyState icon={Building2} title="No Farms Yet" description="Add your first farm location to get started."
          action={{ label: 'New Farm', onClick: () => setCreateFarmOpen(true) }} />
      ) : (
        <div className="space-y-2">
          {farms.map((farm) => (
            <Card key={farm.id} className="overflow-hidden">
              <button className="w-full text-left" onClick={() => handleSelectFarm(farm.id)}>
                <CardContent className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{farm.name}</span>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{farm.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{farm._count.sheds} shed{farm._count.sheds !== 1 ? 's' : ''}</span>
                    <span className="text-xs text-muted-foreground">Capacity: {farm.capacity.toLocaleString()}</span>
                    <StatusBadge status={farmStatusMap[farm.status] ?? 'inactive'} label={farm.status.replace('_', ' ')} />
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedFarm === farm.id ? 'rotate-90' : ''}`} />
                  </div>
                </CardContent>
              </button>

              {selectedFarm === farm.id && (
                <div className="border-t bg-muted/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5"><Warehouse className="h-3.5 w-3.5" /> Sheds</h4>
                    <Button size="sm" variant="outline" onClick={() => setCreateShedFor(farm.id)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Shed</Button>
                  </div>
                  {shedsLoading ? (
                    <div className="space-y-2"><Skeleton className="h-12 w-full" /></div>
                  ) : sheds.length === 0 ? (
                    <EmptyState icon={Warehouse} title="No Sheds" description="Add a shed to start placing flocks." className="py-6" />
                  ) : (
                    <div className="space-y-2">
                      {sheds.map((shed) => (
                        <div key={shed.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                          <div>
                            <span className="text-sm font-medium">{shed.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs capitalize">{shed.shedType}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{shed.currentCount.toLocaleString()} / {shed.capacity.toLocaleString()} birds</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
