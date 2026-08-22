'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/providers/organization-provider'
import { useState } from 'react'
import { Building2, Settings, Users, Globe, Blocks, Plus } from 'lucide-react'

export default function BusinessPage() {
  const { activeOrganization } = useOrganization()
  const loading = false

  if (!activeOrganization) {
    return (
      <EmptyState
        icon={Building2}
        title="No Organization Selected"
        description="Select or create an organization to manage your business."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Business"
        description={`Manage ${activeOrganization.name} — your organization settings, domains, and team.`}
        actions={
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Quick Action</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = '/settings'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Organization Settings
            </CardTitle>
            <CardDescription>General settings, timezone, locale, currency</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground capitalize">{activeOrganization.status}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = '/team'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Management
            </CardTitle>
            <CardDescription>Members, roles, invitations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {activeOrganization._count.memberships} member{activeOrganization._count.memberships !== 1 ? 's' : ''}, {activeOrganization._count.teams} team{activeOrganization._count.teams !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = '/domains'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Blocks className="h-4 w-4" />
              Domain Modules
            </CardTitle>
            <CardDescription>Industry-specific modules and capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activate domain packages for your organization
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
