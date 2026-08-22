'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrganization } from '@/providers/organization-provider'
import { useEffect, useState } from 'react'
import { Globe, Key, Webhook, Link2 } from 'lucide-react'

export default function IntegrationsPage() {
  const { activeOrganization } = useOrganization()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [webhooks, setWebhooks] = useState<any[]>([])
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
        const [intRes, keyRes, whRes] = await Promise.allSettled([
          fetch('/api/integrations', { headers }).then((r) => r.json()),
          fetch('/api/api-keys', { headers }).then((r) => r.json()),
          fetch('/api/webhooks', { headers }).then((r) => r.json()),
        ])
        if (intRes.status === 'fulfilled' && intRes.value) {
          setIntegrations(Array.isArray(intRes.value) ? intRes.value : (intRes.value.data ?? []))
        }
        if (keyRes.status === 'fulfilled' && keyRes.value) {
          setApiKeys(Array.isArray(keyRes.value) ? keyRes.value : (keyRes.value.data ?? []))
        }
        if (whRes.status === 'fulfilled' && whRes.value) {
          setWebhooks(Array.isArray(whRes.value) ? whRes.value : (whRes.value.data ?? []))
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
        icon={Globe}
        title="No Organization Selected"
        description="Select an organization to manage integrations."
      />
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
              <Link2 className="h-4 w-4" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{integrations.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{apiKeys.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{webhooks.length}</p>}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : integrations.length === 0 && apiKeys.length === 0 && webhooks.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No Integrations Configured"
          description="Connect external services, create API keys, and set up webhooks to extend your organization's capabilities."
        />
      ) : (
        <>
          {apiKeys.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">API Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apiKeys.slice(0, 10).map((key: any) => (
                    <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium">{key.name || key.id}</span>
                          <p className="text-xs text-muted-foreground">{key.prefix || '****'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{key.status || 'active'}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {webhooks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {webhooks.slice(0, 10).map((wh: any) => (
                    <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Webhook className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-sm font-medium">{wh.name || wh.id}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{wh.url || ''}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{wh.status || 'active'}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
