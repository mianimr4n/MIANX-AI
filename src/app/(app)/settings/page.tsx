'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrganization } from '@/providers/organization-provider'
import { Settings, Shield, Bell, Globe, Database } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const { activeOrganization } = useOrganization()
  const [roles, setRoles] = useState<any[]>([])
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
        const roleRes = await fetch('/api/roles', { headers }).then((r) => r.json())
        setRoles(Array.isArray(roleRes) ? roleRes : (roleRes.data ?? []))
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
        icon={Settings}
        title="No Organization Selected"
        description="Select an organization to access settings."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={`Configuration for ${activeOrganization.name}.`}
      />

      {/* Organization Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Organization Details
          </CardTitle>
          <CardDescription>General organization configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-medium">{activeOrganization.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Slug</span>
              <p className="font-medium">/{activeOrganization.slug}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p><Badge variant="outline" className="text-xs capitalize">{activeOrganization.status}</Badge></p>
            </div>
            <div>
              <span className="text-muted-foreground">Currency</span>
              <p className="font-medium">{activeOrganization.currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles & Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </CardTitle>
          <CardDescription>RBAC configuration for this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roles.map((role: any) => (
                <Badge key={role.id} variant="outline">{role.name || role.slug}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No custom roles configured. Default roles: owner, admin, member, viewer.</p>
          )}
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            API & Integrations
          </CardTitle>
          <CardDescription>API keys and webhook configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage API keys and webhooks from the <a href="/integrations" className="text-primary underline">Integrations</a> page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
