'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [supabaseConfigured, setSupabaseConfigured] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')

    fetch('/api/me')
      .then(r => { if (r.status === 503) setSupabaseConfigured(false) })
      .catch(() => {})

    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) window.location.href = params.get('redirect') || '/app'
      } catch {
        // Auth configuration errors are shown by the form.
      }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password })

      if (result.error) {
        setError(result.error.message)
        return
      }

      if (result.data.user) {
        if (mode === 'signup' && !result.data.session) {
          setError('Account created. Check your email to confirm your account, then sign in.')
          return
        }
        window.location.href = '/onboarding'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2 justify-center">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">Mianx.ai</span>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-h2">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'Sign in to your account' : 'Start building your business workspace'}
            </p>
          </div>

          {!supabaseConfigured && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              Authentication service is not configured. Please configure Supabase in the production environment.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required disabled={!supabaseConfigured} />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required minLength={6} disabled={!supabaseConfigured} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading || !supabaseConfigured}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {mode === 'login' && (
            <div className="text-center">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot your password?</Link>
            </div>
          )}

          <div className="text-center">
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">MIANX.AI — AI-Native Business Operating System</p>
      </div>
    </div>
  )
}
