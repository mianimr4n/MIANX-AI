'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/providers/organization-provider'
import { useRouter } from 'next/navigation'
import { Building2, Settings, Users, Blocks, Calendar, Bird } from 'lucide-react'

export default function BusinessPage() {
  const { activeOrganization } = useOrganization()
  const router = useRouter()

  if (!activeOrganization) {
    return (
      <EmptyState
        icon={Building2}
        title="No Organization Selected"
        description="Select or create an organization to manage your business."
      />
    )
  }

  const org = activeOrganization
  const createdAt = org.createdAt
    ? new Date(org.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A'

  const cards = [
    {
      icon: Bird,
      title: 'Poultry OS',
      description: 'Farms, sheds, flocks, feed, health, production, procurement, sales',
      href: '/app/business/poultry',
      detail: 'Manage your poultry operations end-to-end',
    },
    {
      icon: Settings,
      title: 'Organization Settings',
      description: 'General settings, timezone, locale, currency',
      href: '/app/settings',
      detail: `Status: ${org.status}`,
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Members, roles, invitations',
      href: '/app/team',
      detail: `${org._count.memberships} member${org._count.memberships !== 1 ? 's' : ''}, ${org._count.teams} team${org._count.teams !== 1 ? 's' : ''}`,
    },
    {
      icon: Blocks,
      title: 'Domain Modules',
      description: 'Industry-specific modules and capabilities',
      href: '/app/domains',
      detail: 'Activate domain packages for your organization',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Business"
        description={`Manage ${org.name} — your organization settings, domains, and team.`}
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{org.name}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{org.slug}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{createdAt}</span>
              </CardDescription>
            </div>
            <span className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">
              {org.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{org._count.memberships}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{org._count.teams}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{org._count.auditLogs}</p>
              <p className="text-xs text-muted-foreground">Audit Logs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card
            key={card.href}
            className="hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => router.push(card.href)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <card.icon className="h-4 w-4" />
                {card.title}
              </CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
