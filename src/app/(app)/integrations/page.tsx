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
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Globe, Key, Webhook, Link2, Plus, Trash2, Copy, Check } from 'lucide-react'

export default function IntegrationsPage() {
  const { activeOrganization } = useOrganization()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState<string | null>(null)

  // Create API Key dialog
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyExpiry, setKeyExpiry] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Create Webhook dialog
  const [whDialogOpen, setWhDialogOpen] = useState(false)
  const [whForm, setWhForm] = useState({ name: '', url: '', eventTypes: '*<meta>' })
  const [creatingWh, setCreatingWh] = useState(false)

  // Delete target
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'key' | 'webhook'; id: string; name: string } | null>(null)

  const orgFetch = useCallback((url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      headers: { 'X-Organization-Id': activeOrganization!.id, ...options?.headers },
    })
  }, [activeOrganization])

  const fetchData = useCallback(async () => {
    if (!activeOrganization) return
    try {
      const [intRes, keyRes, whRes] = await Promise.allSettled([
        orgFetch('/api/integrations').then(r => r.json()),
        orgFetch('/api/api-keys').then(r => r.json()),
        orgFetch('/api/webhooks').then(r => r.json()),
      ])
      if (intRes.status === 'fulfilled' && intRes.value) {
        const d = intRes.value.data ?? intRes.value
        setIntegrations(Array.isArray(d) ? d : [])
      }
      if (keyRes.status === 'fulfilled' && keyRes.value) {
        const d = keyRes.value.data ?? keyRes.value
        setApiKeys(Array.isArray(d) ? d : [])
      }
      if (whRes.status === 'fulfilled' && whRes.value) {
        const d = whRes.value.data ?? whRes.value
        setWebhooks(Array.isArray(d) ? d : [])
      }
      setError(null)
    } catch (err) {
      setError('Failed to load integrations')
    }
  }, [activeOrganization, orgFetch])

  useEffect(() => {
    if (!activeOrganization) { setLoading(false); return }
    fetchData().finally(() => setLoading(false))
  }, [activeOrganization, fetchData])

  const handleCreateKey = async () => {
    if (!keyName.trim()) { toast.error('Key name is required'); return }
    setCreatingKey(true)
    try {
      const body: any = { name: keyName.trim() }
      if (keyExpiry) {
        const days = Number(keyExpiry)
        if (days > 0) body.expiresInDays = days
      }
      const res = await orgFetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json())
      const keyData = res?.data ?? res
      if (keyData?.key || keyData?.plaintext) {
        const secret = keyData.key || keyData.plaintext
        setRevealedKey(secret)
        setCopiedKey(false)
        toast.success('API key created. Copy it now — it cannot be retrieved again.')
        fetchData()
      } else {
        toast.error(res?.error || 'Failed to create API key')
      }
    } catch {
      toast.error('Failed to create API key')
    } finally {
      setCreatingKey(false)
      setKeyName('')
      setKeyExpiry('')
    }
  }

  const handleDeleteKey = async (id: string) => {
    setMutating(id)
    try {
      const res = await orgFetch(`/api/api-keys/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'revoked' }) }).then(r => r.json())
      toast.success('API key revoked')
      setApiKeys(prev => prev.filter(k => k.id !== id))
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to revoke API key')
    } finally {
      setMutating(null)
    }
  }

  const handleCreateWebhook = async () => {
    if (!whForm.name.trim() || !whForm.url.trim()) { toast.error('Name and URL are required'); return }
    try {
      new URL(whForm.url)
    } catch {
      toast.error('Invalid URL format'); return
    }
    setCreatingWh(true)
    try {
      const eventTypes = whForm.eventTypes.trim() === '*' ? ['*'] : whForm.eventTypes.split(',').map(s => s.trim()).filter(Boolean)
      const res = await orgFetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: whForm.name.trim(),
          url: whForm.url.trim(),
          eventTypes,
        }),
      }).then(r => r.json())
      if (res.data) {
        toast.success('Webhook created')
        setWhDialogOpen(false)
        setWhForm({ name: '', url: '', eventTypes: '*<meta>' })
        fetchData()
      } else {
        toast.error(res?.error || 'Failed to create webhook')
      }
    } catch {
      toast.error('Failed to create webhook')
    } finally {
      setCreatingWh(false)
    }
  }

  const handleToggleWebhook = async (wh: any) => {
    const newStatus = wh.status === 'active' ? 'disabled' : 'active'
    setMutating(wh.id)
    try {
      const res = await orgFetch(`/api/webhooks/${wh.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).then(r => r.json())
      if (res.data) {
        toast.success(`Webhook ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
        setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, status: newStatus } : w))
      } else {
        toast.error(res?.error || 'Failed to update webhook')
      }
    } catch {
      toast.error('Failed to update webhook')
    } finally {
      setMutating(null)
    }
  }

  const handleDeleteWebhook = async (id: string) => {
    setMutating(id)
    try {
      await orgFetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      toast.success('Webhook deleted')
      setWebhooks(prev => prev.filter(w => w.id !== id))
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete webhook')
    } finally {
      setMutating(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  if (!activeOrganization) {
    return <EmptyState icon={Globe} title="No Organization Selected" description="Select an organization to manage integrations." />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Integrations" description="Connect external services, manage API keys, and configure webhooks." />
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external services, manage API keys, and configure webhooks."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" /> OAuth Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{integrations.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" /> API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{apiKeys.filter(k => k.status !== 'revoked').length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{webhooks.filter(w => w.status !== 'disabled').length}</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
      ) : integrations.length === 0 && apiKeys.length === 0 && webhooks.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No Integrations Configured"
          description="Create API keys, set up webhooks, or connect OAuth services."
          action={{
            label: 'API Key',
            onClick: () => setKeyDialogOpen(true),
          }}
        />
      ) : (
        <Tabs defaultValue="keys">
          <TabsList>
            <TabsTrigger value="keys">API Keys ({apiKeys.length})</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks ({webhooks.length})</TabsTrigger>
            {integrations.length > 0 && (
              <TabsTrigger value="connections">OAuth ({integrations.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="keys" className="mt-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">API Keys</CardTitle>
                <Button size="sm" onClick={() => setKeyDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Key</Button>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No API keys. Create one to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium">{key.name || key.id}</span>
                            <p className="text-xs text-muted-foreground">{key.prefix || '****'}{key.expiresAt ? ` · Expires ${new Date(key.expiresAt).toLocaleDateString()}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={key.status === 'revoked' ? 'destructive' : 'outline'} className="text-xs">{key.status || 'active'}</Badge>
                          {key.status !== 'revoked' && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={mutating === key.id}
                              onClick={() => setDeleteTarget({ type: 'key', id: key.id, name: key.name || key.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Webhooks</CardTitle>
                <Button size="sm" onClick={() => setWhDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Webhook</Button>
              </CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No webhooks configured. Create one to receive event notifications.</p>
                ) : (
                  <div className="space-y-2">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Webhook className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm font-medium truncate block">{wh.name || wh.id}</span>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{wh.url || ''}</p>
                            {wh.eventTypes && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {Array.isArray(wh.eventTypes) ? wh.eventTypes.slice(0, 3).map((et: string) => (
                                  <Badge key={et} variant="secondary" className="text-xs">{et}</Badge>
                                )) : null}
                                {Array.isArray(wh.eventTypes) && wh.eventTypes.length > 3 && (
                                  <span className="text-xs text-muted-foreground">+{wh.eventTypes.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={wh.status !== 'disabled'}
                            disabled={mutating === wh.id}
                            onCheckedChange={() => handleToggleWebhook(wh)}
                          />
                          <Button
                            variant="ghost" size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={mutating === wh.id}
                            onClick={() => setDeleteTarget({ type: 'webhook', id: wh.id, name: wh.name || wh.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {integrations.length > 0 && (
            <TabsContent value="connections" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">OAuth Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {integrations.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium">{conn.provider || conn.id}</span>
                            <p className="text-xs text-muted-foreground">Connected</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">{conn.status || 'active'}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Create API Key Dialog */}
      <Dialog open={keyDialogOpen} onOpenChange={(open) => { if (!open) { setKeyDialogOpen(false); setRevealedKey(null) } }}>
        <DialogContent>
          {revealedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>Copy this key now. It cannot be retrieved again.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg border p-3 bg-muted/50">
                  <code className="text-xs break-all block">{revealedKey}</code>
                </div>
                <Button
                  className="w-full"
                  onClick={() => copyToClipboard(revealedKey)}
                >
                  {copiedKey ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copiedKey ? 'Copied!' : 'Copy Key'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>Generate a new API key for programmatic access.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Key Name *</Label>
                  <Input placeholder="e.g. Production API" value={keyName} onChange={e => setKeyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Expires In (days, leave empty for no expiry)</Label>
                  <Input type="number" placeholder="e.g. 90" value={keyExpiry} onChange={e => setKeyExpiry(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setKeyDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateKey} disabled={creatingKey || !keyName.trim()}>
                  {creatingKey ? 'Creating...' : 'Create Key'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={whDialogOpen} onOpenChange={setWhDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>Set up a webhook to receive event notifications via HTTP POST.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g. Slack Notifications" value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input placeholder="https://example.com/webhook" value={whForm.url} onChange={e => setWhForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Event Types (comma-separated, or * for all)</Label>
              <Input placeholder="*" value={whForm.eventTypes} onChange={e => setWhForm(f => ({ ...f, eventTypes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWebhook} disabled={creatingWh || !whForm.name.trim() || !whForm.url.trim()}>
              {creatingWh ? 'Creating...' : 'Create Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deleteTarget?.type === 'key' ? 'Revoke API Key' : 'Delete Webhook'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.type === 'key'
              ? `Are you sure you want to revoke "${deleteTarget?.name}"? This action cannot be undone. Any applications using this key will lose access.`
              : `Are you sure you want to delete webhook "${deleteTarget?.name}"? Event deliveries will stop.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!deleteTarget) return
              if (deleteTarget.type === 'key') handleDeleteKey(deleteTarget.id)
              else handleDeleteWebhook(deleteTarget.id)
            }}
            disabled={mutating !== null}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteTarget?.type === 'key' ? 'Revoke' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  )
}