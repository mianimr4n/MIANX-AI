'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { Settings, Shield, Globe, Database, Save, Check, Loader2, Trash2, AlertTriangle } from 'lucide-react'

// ── Types ──────────────────────────────────────────────
type RoleData = {
  id: string
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  memberCount: number
  permissions: { key: string; description: string | null }[]
}

const TIMEZONES = [
  'UTC', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Riyadh',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London',
  'Europe/Berlin', 'Europe/Paris', 'US/Eastern', 'US/Central', 'US/Pacific',
]

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'Urdu' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'PKR', label: 'PKR (Rs)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'SAR', label: 'SAR (﷼)' },
  { value: 'INR', label: 'INR (₹)' },
]

// ── Helper: API fetch with org header ─────────────────
function orgFetch(orgId: string, url: string, init?: RequestInit) {
  return fetch(url, { ...init, headers: { 'X-Organization-Id': orgId, 'Content-Type': 'application/json', ...init?.headers } })
}

function unwrap<T>(res: Response): Promise<T> {
  return res.json().then((json) => {
    const d = json?.data ?? json
    return Array.isArray(d) ? d : (json.data !== undefined ? json.data : json)
  })
}

// ── Edit Org Form ─────────────────────────────────────
function OrgSettingsForm({ orgId, orgSlug, initialData, onUpdate }: {
  orgId: string
  orgSlug: string
  initialData: { name: string; timezone: string; locale: string; currency: string }
  onUpdate: (data: { name: string; timezone: string; locale: string; currency: string }) => void
}) {
  const [form, setForm] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await orgFetch(orgId, `/api/organizations/${orgId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: form.name.trim(), timezone: form.timezone, locale: form.locale, currency: form.currency }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to update (${res.status})`)
      }
      onUpdate(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input id="org-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Slug (read-only)</Label>
          <Input value={orgSlug} disabled className="text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select value={form.timezone} onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Locale</Label>
          <Select value={form.locale} onValueChange={(v) => setForm((f) => ({ ...f, locale: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LOCALES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving || !form.name.trim() || form.name.trim().length < 2}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : saved ? <Check className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

// ── Roles & Permissions Tab ───────────────────────────
function RolesTable({ orgId }: { orgId: string }) {
  const [roles, setRoles] = useState<RoleData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  const fetchRoles = useCallback(async () => {
    try {
      const res = await orgFetch(orgId, '/api/roles')
      if (res.ok) {
        const data = await unwrap<RoleData[]>(res)
        setRoles(Array.isArray(data) ? data : [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  if (loading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-2">
      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No roles configured.</p>
      ) : (
        roles.map((role) => (
          <div key={role.id} className="rounded-lg border">
            <button
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
              onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{role.name}</span>
                  <Badge variant="outline" className="text-xs">{role.slug}</Badge>
                  {role.isSystem && <Badge variant="secondary" className="text-xs">System</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{role.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{role.memberCount} member{role.memberCount !== 1 ? 's' : ''}</span>
              <span>{role.permissions.length} perm{role.permissions.length !== 1 ? 's' : ''}</span>
            </div>
          </button>
          {expandedRole === role.id && (
            <div className="px-3 pb-3 border-t">
              <div className="flex flex-wrap gap-1.5 mt-2">
                {role.permissions.map((p) => (
                  <Badge key={p.key} variant="outline" className="text-xs font-normal">
                    {p.key}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ))
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────
export default function SettingsPage() {
  const { activeOrganization, setActiveOrganization } = useOrganization()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (!activeOrganization) { setLoading(false); return }
    // Roles fetched by child component
    setLoading(false)
  }, [activeOrganization])

  const handleOrgUpdate = (data: { name: string; timezone: string; locale: string; currency: string }) => {
    if (activeOrganization) {
      // Trigger a full org list refresh by invalidating the query cache
      // (org name change will be reflected on next fetch)
      window.location.reload()
    }
  }

  const handleArchive = async () => {
    if (!activeOrganization || !confirmArchive) return
    setArchiving(true)
    try {
      const res = await orgFetch(activeOrganization.id, `/api/organizations/${activeOrganization.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        window.location.href = '/app'
      }
    } catch { /* silent */ } finally {
      setArchiving(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!activeOrganization) {
    return <EmptyState icon={Settings} title="No Organization Selected" description="Select an organization to access settings." />
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description={`Configuration for ${activeOrganization.name}.`} />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general"><Globe className="h-4 w-4 mr-1" /> General</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-1" /> Roles</TabsTrigger>
          <TabsTrigger value="integrations"><Database className="h-4 w-4 mr-1" /> Integrations</TabsTrigger>
          <TabsTrigger value="danger" className="text-destructive"><AlertTriangle className="h-4 w-4 mr-1" /> Danger</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Organization Details</CardTitle>
              <CardDescription>Update your organization&apos;s name, timezone, locale, and currency.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrgSettingsForm
                orgId={activeOrganization.id}
                orgSlug={activeOrganization.slug}
                initialData={{
                  name: activeOrganization.name,
                  timezone: (activeOrganization as unknown as Record<string, string>).timezone || 'UTC',
                  locale: (activeOrganization as unknown as Record<string, string>).locale || 'en',
                  currency: activeOrganization.currency || 'USD',
                }}
                onUpdate={handleOrgUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Roles &amp; Permissions</CardTitle>
              <CardDescription>View all roles and their assigned permissions. System roles cannot be deleted.</CardDescription>
            </CardHeader>
            <CardContent>
              <RolesTable orgId={activeOrganization.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> API &amp; Integrations</CardTitle>
              <CardDescription>Manage API keys and webhooks.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage API keys and webhooks from the <a href="/app/integrations" className="text-primary underline">Integrations</a> page.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Danger Zone</CardTitle>
              <CardDescription>Irreversible actions that affect your entire organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30">
                <div>
                  <p className="text-sm font-medium">Archive Organization</p>
                  <p className="text-xs text-muted-foreground">This will mark the organization as archived. You will lose access.</p>
                </div>
                {!confirmArchive ? (
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/50" onClick={() => setConfirmArchive(true)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Archive
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmArchive(false)}>Cancel</Button>
                    <Button variant="destructive" size="sm" disabled={archiving} onClick={handleArchive}>
                      {archiving ? 'Archiving...' : 'Confirm Archive'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}