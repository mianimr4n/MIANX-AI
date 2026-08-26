'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Building2, Bot, Workflow, Globe, Blocks, LayoutDashboard, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const GOALS = [
  { id: 'ai-automation', label: 'AI & Automation', description: 'Use AI assistants and automated workflows', icon: Bot },
  { id: 'business-ops', label: 'Business Operations', description: 'Manage teams, billing, and daily operations', icon: Building2 },
  { id: 'integrations', label: 'Integrations', description: 'Connect external tools and services', icon: Globe },
  { id: 'platform', label: 'Domain / SaaS Platform', description: 'Build domain-specific products', icon: Blocks },
  { id: 'explore', label: 'Explore Dashboard', description: 'Look around and learn the platform', icon: LayoutDashboard },
]

type Step = 'welcome' | 'organization' | 'goal' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [orgName, setOrgName] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

  // Check auth on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/login')
        return
      }
      setAuthenticated(true)
      // Check if user already has an organization
      fetch('/api/organizations')
        .then((r) => r.json())
        .then((json) => {
          const orgs = Array.isArray(json) ? json : (json.data ?? [])
          if (orgs.length > 0) {
            // User already has an org, skip onboarding
            router.push('/app')
          }
        })
        .catch(() => { /* stay on onboarding */ })
    })
  }, [router])

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim() || orgName.trim().length < 2) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim() }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to create organization (${res.status})`)
      }
      setStep('goal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  function handleComplete() {
    router.push('/app')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">Mianx.ai</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['welcome', 'organization', 'goal', 'complete'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                ['welcome', 'organization', 'goal', 'complete'].indexOf(step) >= i
                  ? 'bg-primary'
                  : 'bg-muted'
              }`} />
              {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Welcome ── */}
        {step === 'welcome' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to Mianx.ai</CardTitle>
              <CardDescription>
                Let us set up your workspace. This will only take a minute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Create your organization</p>
                    <p>Your workspace where your team and data live.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Choose your primary goal</p>
                    <p>Help us customize your experience.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Start using the platform</p>
                    <p>Jump into your dashboard and get going.</p>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep('organization')}>
                Let's Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Organization ── */}
        {step === 'organization' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create Your Organization</CardTitle>
              <CardDescription>
                This is your workspace. You can create more later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label htmlFor="org-name" className="text-sm font-medium">
                    Organization Name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    required
                    minLength={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can change this later in Settings.
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('welcome')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={loading || orgName.trim().length < 2} className="flex-1">
                    {loading ? 'Creating...' : 'Create Organization'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Goal ── */}
        {step === 'goal' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">What is Your Primary Goal?</CardTitle>
              <CardDescription>
                This helps us tailor your initial experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                      selectedGoal === goal.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <goal.icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                      selectedGoal === goal.id ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{goal.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                    </div>
                    {selectedGoal === goal.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-auto mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                disabled={!selectedGoal}
                onClick={handleComplete}
              >
                Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}