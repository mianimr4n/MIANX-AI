'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Database, Shield, Blocks, Brain, Workflow,
  Globe, CheckCircle2, Circle, Clock, ArrowRight, Server,
  FolderTree, Table2, Cpu, Layers, Users, Building2, FileText,
  ShieldCheck, Loader2, XCircle, Play, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  PHASES,
  CORE_TABLES,
  DOMAIN_TABLES,
  ARCHITECTURE_LAYERS,
  APP_VERSION,
} from '@/lib/constants'

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
}[]

type IsolationResult = {
  results: { name: string; passed: boolean; detail: string }[]
  summary: { total: number; passed: number; failed: number }
}

const iconMap: Record<string, React.ElementType> = {
  monitor: Server,
  globe: Globe,
  shield: Shield,
  blocks: Blocks,
  brain: Brain,
  workflow: Workflow,
  database: Database,
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [orgs, setOrgs] = useState<OrgData | null>(null)
  const [isolation, setIsolation] = useState<IsolationResult | null>(null)
  const [isolationLoading, setIsolationLoading] = useState(false)
  const [authTestResult, setAuthTestResult] = useState<IsolationResult | null>(null)
  const [authTestLoading, setAuthTestLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'authorization' | 'database' | 'tenancy' | 'architecture'>('overview')

  const fetchData = useCallback(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {})
    fetch('/api/organizations?limit=10').then(r => r.json()).then(d => setOrgs(d.data)).catch(() => {})
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const runIsolationTest = async () => {
    setIsolationLoading(true)
    setIsolation(null)
    try {
      const res = await fetch('/api/test/isolation', { method: 'POST' })
      const data = await res.json()
      setIsolation(data.data)
    } catch {
      setIsolation(null)
    } finally {
      setIsolationLoading(false)
    }
  }

  const completedPhases = PHASES.filter(p => p.status === 'completed').length
  const inProgressPhases = PHASES.filter(p => p.status === 'in-progress').length
  const progressPct = Math.round(((completedPhases + inProgressPhases * 0.5) / PHASES.length) * 100)

  const runAuthTest = async () => {
    setAuthTestLoading(true)
    setAuthTestResult(null)
    try {
      const res = await fetch('/api/test/authorization', { method: 'POST' })
      const data = await res.json()
      setAuthTestResult(data.data)
    } catch {
      setAuthTestResult(null)
    } finally {
      setAuthTestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Mianx.ai</h1>
              <p className="text-[10px] text-muted-foreground leading-none">AI-Native Business OS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] font-mono">v{APP_VERSION}</Badge>
            {health && (
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground hidden sm:inline">{health.checks.database.status === 'ok' ? 'DB Connected' : 'DB Error'}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        {/* ── Hero Card ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="border-border/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 pointer-events-none" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                    Phase 2: Identity & Authorization
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Multi-Tenant, Multi-Domain, AI-Native Business Operating System
                  </CardDescription>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/15">
                  <Clock className="w-3 h-3 mr-1" />
                  In Progress
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-semibold">{completedPhases} done + 1 active / {PHASES.length} phases</span>
                </div>
                <Progress value={progressPct} className="h-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <StatCard label="Organizations" value={orgs ? orgs.length.toString() : '...'} icon={Building2} />
                  <StatCard label="API Routes" value="18" icon={Globe} />
                  <StatCard label="Auth Tests" value={authTestResult ? `${authTestResult.summary.passed}/${authTestResult.summary.total}` : '—'} icon={ShieldCheck} />
                  <StatCard label="API Latency" value={health ? `${health.checks.api.latency_ms}ms` : '...'} icon={Activity} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto">
          {(['overview', 'authorization', 'database', 'tenancy', 'architecture'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <OverviewTab health={health} orgs={orgs} />
            </motion.div>
          )}
          {activeTab === 'database' && (
            <motion.div key="database" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <DatabaseTab />
            </motion.div>
          )}
          {activeTab === 'authorization' && (
            <motion.div key="authorization" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <AuthorizationTab
                authTestResult={authTestResult}
                authTestLoading={authTestLoading}
                onRunTest={runAuthTest}
              />
            </motion.div>
          )}
          {activeTab === 'tenancy' && (
            <motion.div key="tenancy" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <TenancyTab
                isolation={isolation}
                isolationLoading={isolationLoading}
                onRunTest={runIsolationTest}
              />
            </motion.div>
          )}
          {activeTab === 'architecture' && (
            <motion.div key="architecture" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <ArchitectureTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-border/50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>Mianx.ai v{APP_VERSION} — Build the Core once. Build unlimited Business OS products on top.</span>
          <span>Phase 2 / 11</span>
        </div>
      </footer>
    </div>
  )
}

// ── Stat Card ──
function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-background">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Overview Tab ──
function OverviewTab({ health, orgs }: { health: HealthData | null; orgs: OrgData | null }) {
  return (
    <div className="space-y-4">
      {/* Organizations Live Data */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organizations
          </CardTitle>
          <CardDescription>Live data from /api/organizations</CardDescription>
        </CardHeader>
        <CardContent>
          {!orgs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading organizations...
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations found. Create one via POST /api/organizations</p>
          ) : (
            <div className="space-y-2">
              {orgs.map((org) => (
                <div key={org.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{org.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {org._count.memberships}</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {org._count.teams} teams</span>
                      <span className="font-mono">{org.currency}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] font-mono">{org.slug}</Badge>
                    <Badge className={`text-[10px] ${org.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`} variant="outline">
                      {org.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Timeline */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Phase Timeline</CardTitle>
          <CardDescription>32-week implementation roadmap — 12 phases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {PHASES.map((phase, i) => (
              <PhaseRow key={phase.id} phase={phase} index={i} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Check */}
      {health && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4" />
                System Health
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.location.reload()}>
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HealthItem label="API Endpoint" status={health.checks.api.status} latency={health.checks.api.latency_ms} />
              <HealthItem label="Database" status={health.checks.database.status} latency={health.checks.database.latency_ms} />
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last checked: {new Date(health.timestamp).toLocaleString()}</span>
              <code className="font-mono">/api/health</code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Tenancy Tab ──
function TenancyTab({
  isolation,
  isolationLoading,
  onRunTest,
}: {
  isolation: IsolationResult | null
  isolationLoading: boolean
  onRunTest: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Isolation Test Runner */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Tenant Isolation Tests
              </CardTitle>
              <CardDescription className="mt-1">
                Verifies cross-tenant access is blocked at application level
              </CardDescription>
            </div>
            <Button
              onClick={onRunTest}
              disabled={isolationLoading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isolationLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {isolationLoading ? 'Running...' : 'Run Tests'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isolation ? (
            <div className="space-y-3">
              {/* Summary Bar */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                isolation.summary.failed === 0
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}>
                {isolation.summary.failed === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {isolation.summary.failed === 0 ? 'ALL TESTS PASSED' : `${isolation.summary.failed} TEST(S) FAILED`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isolation.summary.passed} passed, {isolation.summary.failed} failed out of {isolation.summary.total}
                  </p>
                </div>
                <Badge className={
                  isolation.summary.failed === 0
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                } variant="outline">
                  {isolation.summary.failed === 0 ? 'PASS' : 'FAIL'}
                </Badge>
              </div>

              {/* Individual Results */}
              <div className="space-y-1.5">
                {isolation.results.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-md border border-border/50">
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Click &quot;Run Tests&quot; to execute 5 tenant isolation tests</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tests create temporary orgs, verify scoping, then clean up</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Isolation Architecture */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Isolation Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { layer: 'Application Level', desc: 'Prisma extension auto-filters all queries by organization_id', status: 'active' },
              { layer: 'Tenant Context', desc: 'AsyncLocalStorage propagates org context through async call chain', status: 'active' },
              { layer: 'Audit Logging', desc: 'All mutations captured with actor, resource, and organization', status: 'active' },
              { layer: 'Database RLS', desc: 'PostgreSQL Row Level Security (production Supabase only)', status: 'pending' },
            ].map(item => (
              <div key={item.layer} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.layer}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${
                  item.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Phase 1 API Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {[
              { method: 'GET', path: '/api/health', desc: 'System health check with DB latency' },
              { method: 'GET', path: '/api/organizations', desc: 'List all organizations with member/team counts' },
              { method: 'POST', path: '/api/organizations', desc: 'Create new organization' },
              { method: 'GET', path: '/api/organizations/:id', desc: 'Get organization detail with domains' },
              { method: 'PATCH', path: '/api/organizations/:id', desc: 'Update organization settings' },
              { method: 'DELETE', path: '/api/organizations/:id', desc: 'Archive organization' },
              { method: 'GET', path: '/api/organizations/:id/members', desc: 'List org members with roles & permissions' },
              { method: 'POST', path: '/api/organizations/:id/members', desc: 'Invite new member' },
              { method: 'GET', path: '/api/audit-logs', desc: 'List audit logs (filterable by org)' },
              { method: 'POST', path: '/api/test/isolation', desc: 'Run 5 tenant isolation tests' },
            ].map(ep => (
              <div key={ep.path + ep.method} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors font-mono text-xs">
                <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 font-mono ${
                  ep.method === 'GET' ? 'text-emerald-600' : ep.method === 'POST' ? 'text-blue-600' : ep.method === 'PATCH' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {ep.method}
                </Badge>
                <span className="text-foreground">{ep.path}</span>
                <span className="text-muted-foreground font-sans text-[11px] hidden sm:inline">— {ep.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Phase Row ──
function PhaseRow({ phase, index }: { phase: (typeof PHASES)[number]; index: number }) {
  const statusConfig = {
    completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    'in-progress': { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    pending: { icon: Circle, color: 'text-muted-foreground/40', bg: '', badge: 'bg-muted text-muted-foreground border-border' },
  }
  const cfg = statusConfig[phase.status]
  const StatusIcon = cfg.icon

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-muted/50 ${phase.status === 'in-progress' ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : ''}`}>
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Phase {phase.id}: {phase.name}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.badge}`}>
            {phase.status === 'in-progress' ? 'In Progress' : phase.status === 'completed' ? 'Done' : 'Pending'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {phase.duration} &middot; {phase.focus}
        </p>
      </div>
      {index < PHASES.length - 1 && (
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
      )}
    </div>
  )
}

// ── Health Item ──
function HealthItem({ label, status, latency }: { label: string; status: string; latency: number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
      <div className={`w-2.5 h-2.5 rounded-full ${status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{status === 'ok' ? 'Operational' : 'Error'} &middot; {latency}ms</p>
      </div>
    </div>
  )
}

// ── Database Tab ──
function DatabaseTab() {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Core Tables
          </CardTitle>
          <CardDescription>13 tenant-isolated tables with organization_id foreign keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CORE_TABLES.map(table => (
              <div key={table} className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                <Table2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <code className="text-xs font-mono">{table}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Blocks className="w-4 h-4" />
            Domain Engine Tables
          </CardTitle>
          <CardDescription>4 tables for manifest-based domain and module management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DOMAIN_TABLES.map(table => (
              <div key={table} className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                <Blocks className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <code className="text-xs font-mono">{table}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Project Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: 'src/core/tenancy/', desc: 'Tenant context, Prisma extension, audit logger' },
              { label: 'src/core/auth/', desc: 'Authentication, session management' },
              { label: 'src/core/authorization/', desc: 'RBAC, permissions, policy engine' },
              { label: 'src/core/domain/', desc: 'Domain registry, manifest validation' },
              { label: 'src/ai/', desc: 'Providers, Agents, Tools, Memory, Knowledge' },
              { label: 'src/automation/', desc: 'Events, Workflows, Jobs, Outbox' },
              { label: 'src/domains/', desc: 'Poultry, Restaurant, Retail, Manufacturing' },
              { label: 'src/database/', desc: 'Seeds, Migrations' },
              { label: 'src/lib/', desc: 'Supabase, Env, Types, Constants' },
              { label: 'src/app/api/', desc: 'Health, Organizations, Audit, Tests' },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-lg border border-border/50 space-y-1">
                <code className="text-xs font-mono font-semibold">{item.label}</code>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Architecture Tab ──
function ArchitectureTab() {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Architecture Layers</CardTitle>
          <CardDescription>7-layer system architecture of Mianx.ai Core</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ARCHITECTURE_LAYERS.map((layer, i) => {
              const Icon = iconMap[layer.icon] || Server
              return (
                <motion.div
                  key={layer.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{layer.name}</p>
                    <p className="text-xs text-muted-foreground">{layer.tech}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">L{i}</Badge>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Tech Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: 'Next.js 16', desc: 'App Router + RSC' },
              { name: 'React 19', desc: 'Server Components' },
              { name: 'TypeScript 5', desc: 'Strict Mode' },
              { name: 'Tailwind CSS 4', desc: 'Utility-first' },
              { name: 'Prisma ORM', desc: 'Type-safe DB' },
              { name: 'Supabase', desc: 'Auth + PostgreSQL' },
              { name: 'shadcn/ui', desc: 'Component Library' },
              { name: 'Vercel AI SDK', desc: 'AI Integration' },
              { name: 'Zustand', desc: 'Client State' },
            ].map(tech => (
              <div key={tech.name} className="p-3 rounded-lg border border-border/50 space-y-0.5">
                <p className="text-sm font-semibold">{tech.name}</p>
                <p className="text-[11px] text-muted-foreground">{tech.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}