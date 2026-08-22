'use client'

import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/providers/organization-provider'
import { useDomain } from '@/providers/domain-provider'
import { useEffect, useState } from 'react'
import { Blocks, Plus, Settings } from 'lucide-react'

type DomainData = {
  id: string
  name: string
  slug: string
  version: string
  description: string | null
  status: string
  _count: { organizationDomains: number; modules: number }
  createdAt: string
}

type OrgDomainData = {
  id: string
  organizationId: string
  domainId: string
  status: string
  activatedAt: string
  domain?: DomainData
}

export default function DomainsPage() {
  const { activeOrganization } = useOrganization()
  const { domains } = useDomain()
  const [allDomains, setAllDomains] = useState<DomainData[]>([])
  const [orgDomains, setOrgDomains] = useState<OrgDomainData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [domainRes, orgDomainRes] = await Promise.allSettled([
          fetch('/api/domains').then((r) => r.json()),
          activeOrganization
            ? fetch('/api/organization-domains', {
                headers: { 'X-Organization-Id': activeOrganization.id },
              }).then((r) => r.json())
            : Promise.resolve([]),
        ])
        if (domainRes.status === 'fulfilled' && domainRes.value) {
          const d = Array.isArray(domainRes.value) ? domainRes.value : (domainRes.value.data ?? [])
          setAllDomains(d)
        }
        if (orgDomainRes.status === 'fulfilled' && orgDomainRes.value) {
          const d = Array.isArray(orgDomainRes.value) ? orgDomainRes.value : (orgDomainRes.value.data ?? [])
          setOrgDomains(d)
        }
      } catch (err) {
        setError('Failed to load domains')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeOrganization])

  async function activateDomain(domainId: string) {
    if (!activeOrganization) return
    setActivating(domainId)
    try {
      const res = await fetch('/api/organization-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': activeOrganization.id,
        },
        body: JSON.stringify({ domainId }),
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch {
      // Error handled silently
    } finally {
      setActivating(null)
    }
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />
  }

  if (!activeOrganization) {
    return (
      <EmptyState
        icon={Blocks}
        title="No Organization Selected"
        description="Select or create an organization to manage domains."
      />
    )
  }

  const activatedDomainIds = new Set(orgDomains.map((od) => od.domainId))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domains"
        description="Browse and activate domain packages for your organization."
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : allDomains.length === 0 ? (
        <EmptyState
          icon={Blocks}
          title="No Domains Available"
          description="Domain packages will appear here once registered on the platform."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDomains.map((domain) => {
            const isActivated = activatedDomainIds.has(domain.id)
            return (
              <Card key={domain.id} className={isActivated ? 'border-primary/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Blocks className="h-4 w-4" />
                      {domain.name}
                    </CardTitle>
                    {isActivated ? (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Available</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {domain.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>v{domain.version}</span>
                      <span>{domain._count.modules} modules</span>
                    </div>
                    {!isActivated && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={activating === domain.id}
                        onClick={() => activateDomain(domain.id)}
                      >
                        {activating === domain.id ? 'Activating...' : 'Activate'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
