'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Database, Shield, Blocks, Brain, Workflow,
  Globe, CheckCircle2, Circle, Clock, ArrowRight, Server,
  FolderTree, Table2, Cpu, Layers
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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
  const [activeTab, setActiveTab] = useState<'overview' | 'database' | 'architecture'>('overview')

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(() => {})
  }, [])

  const completedPhases = PHASES.filter(p => p.status === 'completed').length
  const progressPct = Math.round((completedPhases / PHASES.length) * 100)

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
            <Badge variant="outline" className="text-[10px] font-mono">
              v{APP_VERSION}
            </Badge>
            {health && (
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">{health.checks.database.status === 'ok' ? 'DB Connected' : 'DB Error'}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Hero Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 pointer-events-none" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    Phase 0: Project Foundation
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Multi-Tenant, Multi-Domain, AI-Native Business Operating System
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-semibold">{completedPhases} / {PHASES.length} phases</span>
                </div>
                <Progress value={progressPct} className="h-2" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <StatCard label="Core Tables" value={CORE_TABLES.length.toString()} icon={Table2} />
                  <StatCard label="Domain Tables" value={DOMAIN_TABLES.length.toString()} icon={Table2} />
                  <StatCard label="Arch Layers" value={ARCHITECTURE_LAYERS.length.toString()} icon={Layers} />
                  <StatCard label="API Latency" value={health ? `${health.checks.api.latency_ms}ms` : '...'} icon={Activity} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {(['overview', 'database', 'architecture'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium capitalize ${
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
              <OverviewTab health={health} />
            </motion.div>
          )}
          {activeTab === 'database' && (
            <motion.div key="database" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <DatabaseTab />
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
          <span>Phase 0 / 11</span>
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
function OverviewTab({ health }: { health: HealthData | null }) {
  return (
    <div className="space-y-4">
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

      {/* Health Check Detail */}
      {health && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </CardTitle>
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
        <div className="flex items-center gap-2">
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
              { label: 'src/core/', desc: 'Auth, Authorization, Tenancy, Domain, Permissions' },
              { label: 'src/ai/', desc: 'Providers, Agents, Tools, Memory, Knowledge, Governance' },
              { label: 'src/automation/', desc: 'Events, Workflows, Jobs, Outbox' },
              { label: 'src/domains/', desc: 'Poultry, Restaurant, Retail, Manufacturing' },
              { label: 'src/database/', desc: 'Migrations, Seeds' },
              { label: 'src/lib/', desc: 'Supabase, Env, Types, Constants' },
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
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    L{i}
                  </Badge>
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