'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Database, Shield, Blocks, Brain, Workflow,
  Globe, CheckCircle2, Circle, Clock, ArrowRight, Server,
  FolderTree, Table2, Cpu, Layers, Users, Building2, FileText,
  ShieldCheck, Loader2, XCircle, Play, RefreshCw, Package, Puzzle, Bot, MessageSquare, Zap,
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
  AI_TABLES,
  AUTOMATION_TABLES,
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

type DomainData = {
  id: string
  name: string
  slug: string
  version: string
  description: string | null
  status: string
  _count: { organizationDomains: number; modules: number }
  createdAt: string
}[]

type TestResult = {
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
  const [domains, setDomains] = useState<DomainData | null>(null)
  const [authResult, setAuthResult] = useState<TestResult | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [isoResult, setIsoResult] = useState<TestResult | null>(null)
  const [isoLoading, setIsoLoading] = useState(false)
  const [domainResult, setDomainResult] = useState<TestResult | null>(null)
  const [domainLoading, setDomainLoading] = useState(false)
  const [aiResult, setAiResult] = useState<TestResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiModels, setAiModels] = useState<{ models: { id: string; provider: string; displayName: string; tier: string; capabilities: { streaming: boolean; toolUse: boolean; vision: boolean } }[]; configuredProviders: { provider: string; modelCount: number }[] } | null>(null)
  const [autoResult, setAutoResult] = useState<TestResult | null>(null)
  const [autoLoading, setAutoLoading] = useState(false)
  const [integrationResult, setIntegrationResult] = useState<TestResult | null>(null)
  const [integrationLoading, setIntegrationLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'automation' | 'integration' | 'ai-core' | 'domains' | 'authorization' | 'database' | 'tenancy' | 'architecture'>('overview')

  const fetchData = useCallback(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {})
    fetch('/api/organizations?limit=10').then(r => r.json()).then(d => setOrgs(d.data)).catch(() => {})
    fetch('/api/domains?include=modules').then(r => r.json()).then(d => setDomains(d.data)).catch(() => {})
    fetch('/api/ai/models').then(r => r.json()).then(d => setAiModels(d.data)).catch(() => {})
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const runAuth = async () => { setAuthLoading(true); setAuthResult(null); try { const r = await fetch('/api/test/authorization', { method: 'POST' }); setAuthResult((await r.json()).data) } catch { } finally { setAuthLoading(false) } }
  const runIso = async () => { setIsoLoading(true); setIsoResult(null); try { const r = await fetch('/api/test/isolation', { method: 'POST' }); setIsoResult((await r.json()).data) } catch { } finally { setIsoLoading(false) } }
  const runDomain = async () => { setDomainLoading(true); setDomainResult(null); try { const r = await fetch('/api/test/domain-engine', { method: 'POST' }); setDomainResult((await r.json()).data) } catch { } finally { setDomainLoading(false) } }
  const runAi = async () => { setAiLoading(true); setAiResult(null); try { const r = await fetch('/api/test/ai-core', { method: 'POST' }); setAiResult((await r.json()).data) } catch { } finally { setAiLoading(false) } }
  const runAuto = async () => { setAutoLoading(true); setAutoResult(null); try { const r = await fetch('/api/test/automation', { method: 'POST' }); setAutoResult((await r.json()).data) } catch { } finally { setAutoLoading(false) } }
  const runIntegration = async () => { setIntegrationLoading(true); setIntegrationResult(null); try { const r = await fetch('/api/test/integration', { method: 'POST' }); setIntegrationResult((await r.json()).data) } catch { } finally { setIntegrationLoading(false) } }

  const completedPhases = PHASES.filter(p => p.status === 'completed').length
  const inProgressPhases = PHASES.filter(p => p.status === 'in-progress').length
  const progressPct = Math.round(((completedPhases + inProgressPhases * 0.5) / PHASES.length) * 100)
  const totalModules = domains?.reduce((s, d) => s + d._count.modules, 0) ?? 0
  const totalApiRoutes = 71 // Phases 0-6 combined

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="border-border/50 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 pointer-events-none" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                    Phase 6: API & Integration
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Multi-Tenant, Multi-Domain, AI-Native Business Operating System
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-semibold">{completedPhases} done + {inProgressPhases} active / {PHASES.length} phases</span>
                </div>
                <Progress value={progressPct} className="h-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <StatCard label="Domains" value={domains ? domains.length.toString() : '...'} icon={Puzzle} />
                  <StatCard label="Modules" value={totalModules.toString()} icon={Package} />
                  <StatCard label="API Routes" value={totalApiRoutes.toString()} icon={Globe} />
                  <StatCard label="API Latency" value={health ? `${health.checks.api.latency_ms}ms` : '...'} icon={Activity} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto">
          {(['overview', 'automation', 'integration', 'ai-core', 'domains', 'authorization', 'database', 'tenancy', 'architecture'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium capitalize whitespace-nowrap ${activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><OverviewTab health={health} orgs={orgs} domains={domains} /></motion.div>}
          {activeTab === 'automation' && <motion.div key="automation" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><TestRunnerTab title="Event & Automation" endpoint="/api/test/automation" result={autoResult} loading={autoLoading} onRunTest={runAuto} /></motion.div>}
          {activeTab === 'integration' && <motion.div key="integration" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><IntegrationTab intResult={integrationResult} intLoading={integrationLoading} onRunTest={runIntegration} /></motion.div>}
          {activeTab === 'domains' && <motion.div key="domains" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><DomainsTab domains={domains} domainResult={domainResult} domainLoading={domainLoading} onRunTest={runDomain} /></motion.div>}
          {activeTab === 'authorization' && <motion.div key="authorization" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><AuthTab authResult={authResult} authLoading={authLoading} onRunTest={runAuth} /></motion.div>}
          {activeTab === 'tenancy' && <motion.div key="tenancy" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><TenancyTab isoResult={isoResult} isoLoading={isoLoading} onRunTest={runIso} /></motion.div>}
          {activeTab === 'database' && <motion.div key="database" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><DatabaseTab /></motion.div>}
          {activeTab === 'architecture' && <motion.div key="architecture" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}><ArchitectureTab /></motion.div>}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-border/50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>Mianx.ai v{APP_VERSION} — Build the Core once. Build unlimited Business OS products on top.</span>
          <span>Phase 6 / 11</span>
        </div>
      </footer>
    </div>
  )
}

// ── Stat Card ──
function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/50 bg-background">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-muted-foreground" /></div>
      <div><p className="text-lg font-bold leading-none">{value}</p><p className="text-[11px] text-muted-foreground mt-0.5">{label}</p></div>
    </div>
  )
}

// ── Overview Tab ──
function OverviewTab({ health, orgs, domains }: { health: HealthData | null; orgs: OrgData | null; domains: DomainData | null }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Puzzle className="w-4 h-4" />Global Domains</CardTitle>
          <CardDescription>Manifest-based domain marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          {!domains ? (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading domains...</div>) : (
            <div className="space-y-2">
              {domains.map(d => (
                <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center shrink-0"><Puzzle className="w-5 h-5 text-teal-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{d.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {d._count.modules} modules</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {d._count.organizationDomains} orgs</span>
                      <span className="font-mono">v{d.version}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] font-mono">{d.slug}</Badge>
                    <Badge className={`text-[10px] ${d.status === 'available' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`} variant="outline">{d.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Phase Timeline</CardTitle><CardDescription>32-week implementation roadmap — 12 phases</CardDescription></CardHeader>
        <CardContent><div className="space-y-1">{PHASES.map((phase, i) => <PhaseRow key={phase.id} phase={phase} index={i} />)}</div></CardContent>
      </Card>

      {health && (
        <Card className="border-border/50">
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base font-semibold flex items-center gap-2"><Activity className="w-4 h-4" />System Health</CardTitle><Button variant="ghost" size="sm" className="text-xs" onClick={() => window.location.reload()}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button></div></CardHeader>
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

// ── Domains Tab ──
function DomainsTab({ domains, domainResult, domainLoading, onRunTest }: { domains: DomainData | null; domainResult: TestResult | null; domainLoading: boolean; onRunTest: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Blocks className="w-4 h-4" />Manifest-Based Plugin Architecture</CardTitle>
          <CardDescription>Domains contain modules. Organizations activate domains, then enable modules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Domain = Industry', desc: 'Poultry, Restaurant, Retail — each is a domain', color: 'from-teal-500/10 to-cyan-500/10' },
              { title: 'Module = Feature', desc: 'Flock Management, Menu, POS — modules within a domain', color: 'from-blue-500/10 to-indigo-500/10' },
              { title: 'Manifest Schema', desc: 'mianx-domain/v1 JSON — validated on creation', color: 'from-purple-500/10 to-pink-500/10' },
              { title: 'Org Activation', desc: 'Orgs activate domains, then enable specific modules', color: 'from-amber-500/10 to-orange-500/10' },
            ].map(item => (
              <div key={item.title} className={`p-3 rounded-lg border border-border/50 bg-gradient-to-br ${item.color}`}>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Globe className="w-4 h-4" />Phase 3 API Endpoints</CardTitle><CardDescription>Domain + Module management routes (8 new endpoints)</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {[
              { method: 'GET', path: '/api/domains', desc: 'List all global domains' },
              { method: 'POST', path: '/api/domains', desc: 'Create domain with manifest' },
              { method: 'GET', path: '/api/domains/:id', desc: 'Domain detail with modules' },
              { method: 'PATCH', path: '/api/domains/:id', desc: 'Update domain' },
              { method: 'DELETE', path: '/api/domains/:id', desc: 'Deprecate domain' },
              { method: 'GET', path: '/api/domains/:id/modules', desc: 'List domain modules' },
              { method: 'POST', path: '/api/domains/:id/modules', desc: 'Register new module' },
              { method: 'GET', path: '/api/organization-domains', desc: 'Org active domains' },
              { method: 'POST', path: '/api/organization-domains', desc: 'Activate domain for org' },
              { method: 'GET', path: '/api/organization-modules', desc: 'Org active modules' },
              { method: 'POST', path: '/api/organization-modules', desc: 'Activate module for org' },
              { method: 'POST', path: '/api/test/domain-engine', desc: 'Run 9 domain engine tests' },
            ].map(ep => (
              <div key={ep.method + ep.path} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors font-mono text-xs">
                <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 font-mono ${ep.method === 'GET' ? 'text-emerald-600' : ep.method === 'POST' ? 'text-blue-600' : ep.method === 'PATCH' ? 'text-amber-600' : 'text-red-600'}`}>{ep.method}</Badge>
                <span className="text-foreground truncate">{ep.path}</span>
                <span className="text-muted-foreground font-sans text-[11px] hidden sm:inline truncate max-w-[200px]">{ep.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div><CardTitle className="text-base font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Domain Engine Tests</CardTitle><CardDescription>9 automated tests</CardDescription></div>
            <Button size="sm" onClick={onRunTest} disabled={domainLoading} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">{domainLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}{domainLoading ? 'Running...' : 'Run Tests'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {domainResult ? <TestResults results={domainResult.results} summary={domainResult.summary} /> : <p className="text-sm text-muted-foreground text-center py-6">Click &quot;Run Tests&quot; to execute the domain engine test suite</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ── AI Core Tab ──
function AiCoreTab({ aiResult, aiLoading, onRunTest, aiModels }: { aiResult: TestResult | null; aiLoading: boolean; onRunTest: () => void; aiModels: { models: { id: string; provider: string; displayName: string; tier: string; capabilities: { streaming: boolean; toolUse: boolean; vision: boolean } }[]; configuredProviders: { provider: string; modelCount: number }[] } | null }) {
  const providerColors: Record<string, string> = { openai: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', anthropic: 'text-orange-600 bg-orange-500/10 border-orange-500/20', google: 'text-blue-600 bg-blue-500/10 border-blue-500/20' }
  const tierColors: Record<string, string> = { free: 'text-emerald-600 bg-emerald-500/10', standard: 'text-blue-600 bg-blue-500/10', premium: 'text-purple-600 bg-purple-500/10' }
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Brain className="w-4 h-4" />Provider-Agnostic AI Router</CardTitle>
          <CardDescription>Multiple LLM providers, automatic fallback, tool permission gating, custom agents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { title: '3 Providers', desc: 'OpenAI (GPT-4o, o3-mini), Anthropic (Claude 4), Google (Gemini 2.5)', color: 'from-blue-500/10 to-indigo-500/10' },
              { title: '7 Models', desc: 'Tier-based: free (3), standard (4), premium (0) with auto-fallback', color: 'from-purple-500/10 to-pink-500/10' },
              { title: '6 Tools + Permissions', desc: 'Each tool gated by permission — viewers cannot access audit logs', color: 'from-emerald-500/10 to-teal-500/10' },
              { title: '2 System + Custom Agents', desc: 'General Assistant, Analyst + org-level custom agent configs', color: 'from-amber-500/10 to-orange-500/10' },
              { title: 'Conversation Memory', desc: 'Multi-turn chat persisted per org/user with token tracking', color: 'from-cyan-500/10 to-blue-500/10' },
              { title: 'Streaming + Tools', desc: 'Vercel AI SDK streaming with tool call support', color: 'from-rose-500/10 to-pink-500/10' },
            ].map(item => (
              <div key={item.title} className={`p-3 rounded-lg border border-border/50 bg-gradient-to-br ${item.color}`}>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Registry */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2"><Zap className="w-4 h-4" />Model Registry</CardTitle>
              <CardDescription>{aiModels ? `${aiModels.models.length} models, ${aiModels.configuredProviders.length} provider(s) configured` : 'Loading...'}</CardDescription>
            </div>
            {aiModels && aiModels.configuredProviders.length > 0 && (
              <div className="flex gap-1.5">
                {aiModels.configuredProviders.map(p => (
                  <Badge key={p.provider} variant="outline" className={`text-[10px] capitalize ${providerColors[p.provider] ?? ''}`}>{p.provider} ({p.modelCount})</Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {aiModels ? aiModels.models.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <Badge variant="outline" className={`text-[10px] capitalize px-1.5 shrink-0 ${providerColors[m.provider] ?? ''}`}>{m.provider}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.displayName}</p>
                  <code className="text-[10px] text-muted-foreground font-mono">{m.id}</code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.capabilities.vision && <Badge variant="outline" className="text-[9px] px-1 bg-violet-500/10 text-violet-600 border-violet-500/20">Vision</Badge>}
                  {m.capabilities.toolUse && <Badge variant="outline" className="text-[9px] px-1 bg-teal-500/10 text-teal-600 border-teal-500/20">Tools</Badge>}
                  <Badge variant="outline" className={`text-[9px] px-1 ${tierColors[m.tier] ?? ''}`}>{m.tier}</Badge>
                </div>
              </div>
            )) : <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading model registry...</div>}
          </div>
        </CardContent>
      </Card>

      {/* Agents + Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Bot className="w-4 h-4" />Agent Registry</CardTitle><CardDescription>System agents (always available) + org custom agents</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">System Agents</p>
              {[
                { name: 'General Assistant', provider: 'OpenAI', model: 'gpt-4o-mini', tools: 6, icon: 'Bot' },
                { name: 'Business Analyst', provider: 'Anthropic', model: 'Claude Sonnet 4', tools: 5, icon: 'BarChart3' },
              ].map(a => (
                <div key={a.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50">
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-purple-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">{a.provider} / {a.model} &middot; {a.tools} tools</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider pt-2">Custom Agents (per org)</p>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Manage via <code className="font-mono text-foreground">POST /api/ai/agents</code></span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Cpu className="w-4 h-4" />Tool Registry + Permissions</CardTitle><CardDescription>6 tools, each gated by user permissions</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {[
                { name: 'list_organizations', perm: 'organization.view' },
                { name: 'list_active_domains', perm: 'domain.view' },
                { name: 'list_active_modules', perm: 'module.view' },
                { name: 'list_organization_members', perm: 'member.view' },
                { name: 'get_organization_stats', perm: 'organization.view' },
                { name: 'search_audit_logs', perm: 'audit.view' },
              ].map(t => (
                <div key={t.name} className="flex items-center gap-3 p-2 rounded-md border border-border/50">
                  <code className="text-xs font-mono text-foreground flex-1 truncate">{t.name}</code>
                  <Badge variant="outline" className="text-[9px] px-1 shrink-0 font-mono">{t.perm}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Endpoints */}
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Globe className="w-4 h-4" />Phase 4 API Endpoints</CardTitle><CardDescription>AI chat, conversations, agents (CRUD), tools, models, usage — 12 endpoints</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {[
              { method: 'GET', path: '/api/ai/models', desc: 'List models + configured providers' },
              { method: 'GET', path: '/api/ai/tools', desc: 'List tools with permission requirements' },
              { method: 'GET', path: '/api/ai/agents', desc: 'List system + custom agents' },
              { method: 'POST', path: '/api/ai/agents', desc: 'Create custom agent for org' },
              { method: 'GET', path: '/api/ai/agents/:slug', desc: 'Get custom agent config' },
              { method: 'PATCH', path: '/api/ai/agents/:slug', desc: 'Update custom agent' },
              { method: 'DELETE', path: '/api/ai/agents/:slug', desc: 'Archive custom agent' },
              { method: 'POST', path: '/api/ai/chat', desc: 'Send message (streaming)' },
              { method: 'GET', path: '/api/ai/conversations', desc: 'List user conversations' },
              { method: 'GET', path: '/api/ai/conversations/:id', desc: 'Conversation with messages' },
              { method: 'PATCH', path: '/api/ai/conversations/:id', desc: 'Update conversation title' },
              { method: 'GET', path: '/api/ai/usage', desc: 'AI usage statistics' },
              { method: 'POST', path: '/api/test/ai-core', desc: 'Run 11 AI core tests' },
            ].map(ep => (
              <div key={ep.method + ep.path} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors font-mono text-xs">
                <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 font-mono ${ep.method === 'GET' ? 'text-emerald-600' : ep.method === 'POST' ? 'text-blue-600' : ep.method === 'PATCH' ? 'text-amber-600' : 'text-red-600'}`}>{ep.method}</Badge>
                <span className="text-foreground truncate">{ep.path}</span>
                <span className="text-muted-foreground font-sans text-[11px] hidden sm:inline truncate max-w-[200px]">{ep.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div><CardTitle className="text-base font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />AI Core Tests</CardTitle><CardDescription>11 automated tests</CardDescription></div>
            <Button size="sm" onClick={onRunTest} disabled={aiLoading} className="gap-1.5 bg-purple-600 hover:bg-purple-700">{aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}{aiLoading ? 'Running...' : 'Run Tests'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiResult ? <TestResults results={aiResult.results} summary={aiResult.summary} /> : <p className="text-sm text-muted-foreground text-center py-6">Click &quot;Run Tests&quot; to execute the AI core test suite</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Auth Tab ──
function AuthTab({ authResult, authLoading, onRunTest }: { authResult: TestResult | null; authLoading: boolean; onRunTest: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4" />RBAC Authorization Engine</CardTitle><CardDescription>Fail-closed: missing auth = automatic denial</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Auth Chain', desc: 'Auth \u2192 Membership \u2192 Role \u2192 Permission \u2192 Action', color: 'from-blue-500/10 to-indigo-500/10' },
              { title: 'Permission Format', desc: 'domain.resource.action (3-part) or resource.action (2-part)', color: 'from-purple-500/10 to-pink-500/10' },
              { title: 'System Roles', desc: 'Owner (wildcard) \u2192 Admin \u2192 Member \u2192 Viewer', color: 'from-emerald-500/10 to-teal-500/10' },
              { title: 'Dev Mode', desc: 'X-Dev-Org-Id header for local development', color: 'from-amber-500/10 to-orange-500/10' },
            ].map(item => (<div key={item.title} className={`p-3 rounded-lg border border-border/50 bg-gradient-to-br ${item.color}`}><p className="text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div>))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div><CardTitle className="text-base font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Authorization Tests</CardTitle><CardDescription>10 automated tests</CardDescription></div>
            <Button size="sm" onClick={onRunTest} disabled={authLoading} className="gap-1.5">{authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}{authLoading ? 'Running...' : 'Run Tests'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {authResult ? <TestResults results={authResult.results} summary={authResult.summary} /> : <p className="text-sm text-muted-foreground text-center py-6">Click &quot;Run Tests&quot; to execute the authorization test suite</p>}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Tenancy Tab ──
function TenancyTab({ isoResult, isoLoading, onRunTest }: { isoResult: TestResult | null; isoLoading: boolean; onRunTest: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div><CardTitle className="text-base font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Tenant Isolation Tests</CardTitle><CardDescription>Verifies AsyncLocalStorage + manual scoping</CardDescription></div>
            <Button onClick={onRunTest} disabled={isoLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700">{isoLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}{isoLoading ? 'Running...' : 'Run Tests'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isoResult ? <TestResults results={isoResult.results} summary={isoResult.summary} /> : <div className="flex flex-col items-center justify-center py-8 text-center"><Shield className="w-10 h-10 text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">Click &quot;Run Tests&quot; to execute 5 tenant isolation tests</p></div>}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4" />Isolation Architecture</CardTitle></CardHeader>
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
                <div className="flex-1"><p className="text-sm font-semibold">{item.layer}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                <Badge variant="outline" className={`text-[10px] ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Test Results Component ──
function TestResults({ results, summary }: { results: { name: string; passed: boolean; detail: string }[]; summary: { total: number; passed: number; failed: number } }) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${summary.failed === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
        {summary.failed === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
        <div className="flex-1"><p className="text-sm font-semibold">{summary.failed === 0 ? 'ALL TESTS PASSED' : `${summary.failed} TEST(S) FAILED`}</p><p className="text-xs text-muted-foreground">{summary.passed} passed, {summary.failed} failed out of {summary.total}</p></div>
        <Badge className={summary.failed === 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'} variant="outline">{summary.failed === 0 ? 'PASS' : 'FAIL'}</Badge>
      </div>
      {results.map((r, i) => (
        <div key={i} className="flex items-start gap-3 p-2.5 rounded-md border border-border/50">
          {r.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0"><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground truncate">{r.detail}</p></div>
        </div>
      ))}
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
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}><StatusIcon className={`w-4 h-4 ${cfg.color}`} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium">Phase {phase.id}: {phase.name}</span><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.badge}`}>{phase.status === 'in-progress' ? 'In Progress' : phase.status === 'completed' ? 'Done' : 'Pending'}</Badge></div>
        <p className="text-xs text-muted-foreground mt-0.5">{phase.duration} &middot; {phase.focus}</p>
      </div>
      {index < PHASES.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />}
    </div>
  )
}

// ── Health Item ──
function HealthItem({ label, status, latency }: { label: string; status: string; latency: number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
      <div className={`w-2.5 h-2.5 rounded-full ${status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{status === 'ok' ? 'Operational' : 'Error'} &middot; {latency}ms</p></div>
    </div>
  )
}

// ── Database Tab ──
function DatabaseTab() {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Database className="w-4 h-4" />Core Tables</CardTitle><CardDescription>17 tenant-isolated tables with organization_id foreign keys</CardDescription></CardHeader>
        <CardContent><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{CORE_TABLES.map(table => (<div key={table} className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/30 transition-colors"><Table2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /><code className="text-xs font-mono">{table}</code></div>))}</div></CardContent>
      </Card>
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Blocks className="w-4 h-4" />Domain Engine Tables</CardTitle><CardDescription>4 tables for manifest-based domain and module management</CardDescription></CardHeader>
        <CardContent><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{DOMAIN_TABLES.map(table => (<div key={table} className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/30 transition-colors"><Blocks className="w-3.5 h-3.5 text-teal-500 shrink-0" /><code className="text-xs font-mono">{table}</code></div>))}</div></CardContent>
      </Card>
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><Brain className="w-4 h-4" />AI Core Tables</CardTitle><CardDescription>3 tables for AI conversations, messages, and agent configs</CardDescription></CardHeader>
        <CardContent><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{AI_TABLES.map(table => (<div key={table} className="flex items-center gap-2 p-2.5 rounded-md border border-border/50 hover:bg-muted/30 transition-colors"><Brain className="w-3.5 h-3.5 text-purple-500 shrink-0" /><code className="text-xs font-mono">{table}</code></div>))}</div></CardContent>
      </Card>
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold flex items-center gap-2"><FolderTree className="w-4 h-4" />Project Structure</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: 'src/core/tenancy/', desc: 'Tenant context, Prisma extension, audit logger' },
              { label: 'src/core/authorization/', desc: 'Auth context, RBAC, permissions, middleware' },
              { label: 'src/core/domain/', desc: 'Manifest types, validator, domain registry' },
              { label: 'src/core/auth/', desc: 'Authentication, session management' },
              { label: 'src/ai/', desc: 'Providers, Agents, Tools, Memory, Knowledge' },
              { label: 'src/automation/', desc: 'Events, Workflows, Jobs, Outbox' },
              { label: 'src/integration/', desc: 'API Keys, Webhooks, OAuth, External Client' },
              { label: 'src/domains/', desc: 'Poultry, Restaurant, Retail, Manufacturing' },
              { label: 'src/database/', desc: 'Seeds, Migrations' },
              { label: 'src/lib/', desc: 'Supabase, Env, Types, Constants' },
              { label: 'src/app/api/', desc: 'Health, Orgs, Domains, Auth, Audit, Tests' },
            ].map(item => (<div key={item.label} className="p-3 rounded-lg border border-border/50 space-y-1"><code className="text-xs font-mono font-semibold">{item.label}</code><p className="text-[11px] text-muted-foreground">{item.desc}</p></div>))}
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
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Architecture Layers</CardTitle><CardDescription>7-layer system architecture of Mianx.ai Core</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-2">{ARCHITECTURE_LAYERS.map((layer, i) => { const Icon = iconMap[layer.icon] || Server; return (<motion.div key={layer.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"><div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-emerald-600" /></div><div className="flex-1"><p className="text-sm font-semibold">{layer.name}</p><p className="text-xs text-muted-foreground">{layer.tech}</p></div><Badge variant="outline" className="text-[10px] font-mono shrink-0">L{i}</Badge></motion.div>) })}</div>
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Tech Stack</CardTitle></CardHeader>
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
            ].map(tech => (<div key={tech.name} className="p-3 rounded-lg border border-border/50 space-y-0.5"><p className="text-sm font-semibold">{tech.name}</p><p className="text-[11px] text-muted-foreground">{tech.desc}</p></div>))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Generic Test Runner Tab (reused for automation & integration) ──
function TestRunnerTab({ title, endpoint, result, loading, onRunTest }: { title: string; endpoint: string; result: TestResult | null; loading: boolean; onRunTest: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">{title}</CardTitle><CardDescription>POST {endpoint}</CardDescription></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button onClick={onRunTest} disabled={loading} size="sm">
            {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Running...</> : <><Play className="w-4 h-4 mr-1.5" />Run Tests</>}
          </Button>
          {result && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={result.summary.failed === 0 ? 'default' : 'destructive'}>
                {result.summary.passed}/{result.summary.total} passed
              </Badge>
              {result.summary.failed > 0 && <Badge variant="destructive">{result.summary.failed} failed</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
      {result && (
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Test Results</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {result.results.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1">
                  {t.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <span className="flex-1 font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground max-w-xs truncate">{t.detail}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Integration Tab ──
function IntegrationTab({ intResult, intLoading, onRunTest }: { intResult: TestResult | null; intLoading: boolean; onRunTest: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">API & Integration Engine</CardTitle><CardDescription>API Keys, Webhooks, OAuth Connections, External API Client</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/50 space-y-0.5">
              <p className="text-lg font-bold">4</p>
              <p className="text-[11px] text-muted-foreground">Core Modules</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 space-y-0.5">
              <p className="text-lg font-bold">11</p>
              <p className="text-[11px] text-muted-foreground">API Routes</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 space-y-0.5">
              <p className="text-lg font-bold">4</p>
              <p className="text-[11px] text-muted-foreground">DB Tables</p>
            </div>
            <div className="p-3 rounded-lg border border-border/50 space-y-0.5">
              <p className="text-lg font-bold">10</p>
              <p className="text-[11px] text-muted-foreground">Test Cases</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">API Endpoints</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-xs font-mono">
            {[
              { method: 'GET', path: '/api/api-keys', desc: 'List API keys' },
              { method: 'POST', path: '/api/api-keys', desc: 'Create API key' },
              { method: 'PATCH', path: '/api/api-keys/:id', desc: 'Revoke API key' },
              { method: 'GET', path: '/api/webhooks', desc: 'List webhooks' },
              { method: 'POST', path: '/api/webhooks', desc: 'Create webhook' },
              { method: 'GET', path: '/api/webhooks/:id', desc: 'Get webhook' },
              { method: 'PATCH', path: '/api/webhooks/:id', desc: 'Update webhook' },
              { method: 'DELETE', path: '/api/webhooks/:id', desc: 'Delete webhook' },
              { method: 'POST', path: '/api/webhooks/:id/test', desc: 'Test ping' },
              { method: 'GET', path: '/api/webhooks/deliveries', desc: 'Delivery logs' },
              { method: 'GET', path: '/api/integrations', desc: 'List OAuth connections' },
              { method: 'GET', path: '/api/integrations/providers', desc: 'List providers' },
              { method: 'DELETE', path: '/api/integrations/:provider', desc: 'Revoke OAuth' },
            ].map((ep, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <Badge variant={ep.method === 'GET' ? 'secondary' : ep.method === 'DELETE' ? 'destructive' : 'default'} className="text-[10px] w-12 justify-center font-mono">{ep.method}</Badge>
                <code className="text-xs text-muted-foreground">{ep.path}</code>
                <span className="text-[11px] text-muted-foreground ml-auto">{ep.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TestRunnerTab title="Integration Tests" endpoint="/api/test/integration" result={intResult} loading={intLoading} onRunTest={onRunTest} />
    </div>
  )
}