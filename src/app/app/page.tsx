'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Building2, Blocks, Users, Activity, Bot, Workflow, Globe,
  CreditCard, BarChart3, Settings, ArrowRight, Shield,
} from 'lucide-react'

type HealthData = {
  status: string
  app: string
  version: string
  checks: { database: { status: string; latency_ms: number }; api: { status: string; latency_ms: number } }
}

type AuditEntry = { id: string; action: string; entityType: string; createdAt: string }

function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().length < 2) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to create organization (${res.status})`)
      }
      setName('')
      onOpenChange(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-h2 mb-1">Create Organization</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your organization is your workspace. Create one to get started.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="org-name" className="text-sm font-medium">Organization Name</label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                required
                minLength={2}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || name.trim().length < 2}>
                {loading ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function HomeDashboard() {
  const router = useRouter()
  const { activeOrganization, organizations, setActiveOrganization } = useOrganization()
  const { domains } = useDomain()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([])
  const [auditCount, setAuditCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleOrgCreated = () => {
    window.location.reload()
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const orgId = activeOrganization?.id
        const headers: Record<string, string> = {}
        if (orgId) headers['X-Organization-Id'] = orgId

        const [healthRes, auditRes] = await Promise.allSettled([
          fetch('/api/health').then((r) => r.json()),
          orgId
            ? fetch('/api/audit-logs?limit=5', { headers }).then((r) => r.json()).catch(() => null)
            : Promise.resolve(null),
        ])
        if (healthRes.status === 'fulfilled' && healthRes.value) setHealth(healthRes.value)
        if (auditRes.status === 'fulfilled' && auditRes.value) {
          const data = auditRes.value.data ?? auditRes.value
          if (Array.isArray(data)) {
            setRecentAudit(data)
          }
          if (auditRes.value.meta?.total !== undefined) {
            setAuditCount(auditRes.value.meta.total)
          }
        }
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeOrganization?.id])

  const quickActions = [
    { label: 'Start AI Chat', icon: Bot, href: '/app/ai', color: 'text-violet-500' },
    { label: 'Create Automation', icon: Workflow, href: '/app/automations', color: 'text-blue-500' },
    { label: 'Connect Integration', icon: Globe, href: '/app/integrations', color: 'text-green-500' },
    { label: 'Invite Team Member', icon: Users, href: '/app/team', color: 'text-orange-500' },
    { label: 'View Analytics', icon: BarChart3, href: '/app/analytics', color: 'text-cyan-500' },
    { label: 'Manage Billing', icon: CreditCard, href: '/app/billing', color: 'text-amber-500' },
  ]

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={activeOrganization
            ? `Welcome back to ${activeOrganization.name}.`
            : 'Welcome to Mianx.ai.'}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-center"
                >
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Team Members"
            value={activeOrganization?._count.memberships ?? 0}
            icon={Users}
            description="In your organization"
          />
          <KPICard
            title="Active Domains"
            value={domains.length}
            icon={Blocks}
            description="Activated in this org"
          />
          <KPICard
            title="Audit Events"
            value={auditCount}
            icon={Shield}
            description="Total recorded events"
          />
          <KPICard
            title="Organizations"
            value={organizations.length}
            icon={Building2}
            description="You belong to"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <Button variant="outline" size="sm" onClick={() => router.push('/app/settings')}>
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    Manage Settings
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={Building2}
                  title="No Organization"
                  description="Create your first organization to get started."
                  action={{ label: 'Create Organization', onClick: () => setCreateDialogOpen(true) }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : health ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`h-3 w-3 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-destructive'}`} />
                    <span className="text-sm font-medium">
                      {health.status === 'ok' ? 'All Systems Operational' : 'System Issues Detected'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md border">
                      <div className="text-xs text-muted-foreground">Database</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-2 w-2 rounded-full ${health.checks.database.status === 'ok' ? 'bg-green-500' : 'bg-destructive'}`} />
                        <span className="text-sm font-medium">{health.checks.database.latency_ms}ms</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-md border">
                      <div className="text-xs text-muted-foreground">API</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-2 w-2 rounded-full ${health.checks.api.status === 'ok' ? 'bg-green-500' : 'bg-destructive'}`} />
                        <span className="text-sm font-medium">{health.checks.api.latency_ms}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load system health.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {recentAudit.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest actions in your organization</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/app/analytics')}>
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 p-2 rounded-md text-sm hover:bg-muted/30">
                    <Badge variant="outline" className="text-xs shrink-0">{entry.action}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{entry.entityType}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {organizations.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Organizations</CardTitle>
              <CardDescription>Switch between your workspaces</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setActiveOrganization(org.id)}
                    className={`text-left p-4 rounded-lg border transition-colors ${
                      activeOrganization?.id === org.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{org.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">/{org.slug}</div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <StatusBadge status={org.status as 'active' | 'inactive' | 'suspended'} />
                      <span>{org._count.memberships} members</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleOrgCreated}
      />
    </>
  )
}

export default function HomePage() {
  return <HomeDashboard />
}
