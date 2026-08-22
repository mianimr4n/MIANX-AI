'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout'
import { PageHeader } from '@/components/composite/page-header'
import { KPICard } from '@/components/composite/kpi-card'
import { StatusBadge } from '@/components/composite/status-badge'
import { EmptyState } from '@/components/composite/empty-state'
import { ErrorState } from '@/components/composite/error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/providers/organization-provider'
import { useDomain } from '@/providers/domain-provider'
import { usePermissions } from '@/hooks/use-permissions'
import {
  Building2, Blocks, Users, Activity, Database, Shield, Brain,
  Workflow, Globe, CreditCard, CheckCircle2, Circle, FileText, Zap,
} from 'lucide-react'

// ══════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════

type HealthData = {
  status: string
  app: string
  version: string
  phase: number
  checks: { database: { status: string; latency_ms: number }; api: { status: string; latency_ms: number } }
  timestamp: string
}

type OrgData = {
  id: string
  name: string
  slug: string
  status: string
  currency: string
  _count: { memberships: number; teams: number; auditLogs: number }
  createdAt: string
}

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

// ══════════════════════════════════════════════════════════════════
// Dashboard View Component
// ══════════════════════════════════════════════════════════════════

function HomeDashboard() {
  const { activeOrganization, organizations } = useOrganization()
  const { domains } = useDomain()
  const { permissions } = usePermissions()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [allDomains, setAllDomains] = useState<DomainData[]>([])
  const [auditCount, setAuditCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [healthRes, domainRes, auditRes] = await Promise.allSettled([
          fetch('/api/health').then((r) => r.json()),
          fetch('/api/domains').then((r) => r.json()),
          fetch('/api/audit-logs?limit=1').then((r) => r.json()).catch(() => ({ total: 0 })),
        ])
        if (healthRes.status === 'fulfilled' && healthRes.value) setHealth(healthRes.value)
        if (domainRes.status === 'fulfilled' && domainRes.value) {
          const domainData = Array.isArray(domainRes.value) ? domainRes.value : (domainRes.value.data ?? [])
          setAllDomains(domainData)
        }
        if (auditRes.status === 'fulfilled' && auditRes.value?.total !== undefined) {
          setAuditCount(auditRes.value.total)
        }
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        description={`Welcome back${activeOrganization ? ` to ${activeOrganization.name}` : ''}. Here is your organization summary.`}
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Organizations"
          value={organizations.length}
          icon={Building2}
          description="Total orgs you belong to"
        />
        <KPICard
          title="Active Domains"
          value={domains.length}
          icon={Blocks}
          description="Activated in this org"
        />
        <KPICard
          title="Team Members"
          value={activeOrganization?._count.memberships ?? 0}
          icon={Users}
          description="Across all teams"
        />
        <KPICard
          title="Audit Events"
          value={auditCount}
          icon={FileText}
          description="Total recorded events"
        />
      </div>

      {/* ── Platform Health + Phase Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform Health Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Platform Health
            </CardTitle>
            <CardDescription>Core system status and phase completion</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Health check summary */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={
                    `h-3 w-3 rounded-full ${health?.status === 'ok' ? 'bg-success' : 'bg-destructive'}`
                  } />
                  <span className="text-sm font-medium">
                    {health?.status === 'ok' ? 'All Systems Operational' : 'System Issues Detected'}
                  </span>
                  {health && (
                    <span className="text-caption text-muted-foreground ml-auto">
                      v{health.version} — Phase {health.phase}
                    </span>
                  )}
                </div>

                {/* Phase progress */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'Database', icon: Database, done: true },
                    { name: 'Auth & RBAC', icon: Shield, done: true },
                    { name: 'AI Core', icon: Brain, done: true },
                    { name: 'Automation', icon: Workflow, done: true },
                    { name: 'Integrations', icon: Globe, done: true },
                    { name: 'Billing', icon: CreditCard, done: true },
                    { name: 'Frontend', icon: Activity, done: true },
                    { name: 'Observability', icon: Zap, done: false },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2 p-2 rounded-md border">
                      {p.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Organization Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : activeOrganization ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{activeOrganization.name}</h3>
                  <p className="text-caption text-muted-foreground">/{activeOrganization.slug}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={activeOrganization.status as 'active' | 'inactive' | 'suspended'} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{activeOrganization._count.memberships}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teams</span>
                    <span className="font-medium">{activeOrganization._count.teams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Currency</span>
                    <span className="font-medium">{activeOrganization.currency}</span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No Organization"
                description="Create your first organization to get started."
                action={{ label: 'Create Organization', onClick: () => {} }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Registered Domains ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Blocks className="h-4 w-4" />
                Available Domains
              </CardTitle>
              <CardDescription>Domains registered on the platform</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">{allDomains.length} registered</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : allDomains.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allDomains.map((domain) => {
                const isActive = domains.some((d) => d.domainId === domain.id)
                return (
                  <div
                    key={domain.id}
                    className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Blocks className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium truncate">{domain.name}</h4>
                        {isActive && <StatusBadge status="active" label="Active" />}
                      </div>
                      {domain.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{domain.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>v{domain.version}</span>
                        <span>{domain._count.modules} modules</span>
                        <span>{domain._count.organizationDomains} orgs</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Blocks}
              title="No Domains Registered"
              description="Domain packages will appear here once registered on the platform."
            />
          )}
        </CardContent>
      </Card>

      {/* ── Architecture Layers ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Architecture Layers</CardTitle>
          <CardDescription>Core platform technology stack</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              { name: 'Frontend', tech: 'Next.js 16 + React 19' },
              { name: 'API Layer', tech: 'REST + Webhooks' },
              { name: 'Authorization', tech: 'RBAC + ABAC + RLS' },
              { name: 'Domain Engine', tech: 'Manifest Plugins' },
              { name: 'AI Core', tech: 'Provider-agnostic' },
              { name: 'Automation', tech: 'Events + Workflows' },
              { name: 'Database', tech: 'PostgreSQL + Prisma ORM' },
              { name: 'Billing', tech: 'Plans + Usage Metering' },
            ].map((layer) => (
              <div key={layer.name} className="p-3 rounded-lg border">
                <div className="text-sm font-medium">{layer.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{layer.tech}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// Root Page — wraps everything in AppShell
// ══════════════════════════════════════════════════════════════════

export default function HomePage() {
  return (
    <AppShell>
      <HomeDashboard />
    </AppShell>
  )
}
