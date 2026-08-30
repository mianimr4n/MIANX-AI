'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        setReady(Boolean(session))
      } catch {
        setReady(false)
      }
    })()
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 6 || password !== confirm) {
      setError(password.length < 6 ? 'Password must be at least 6 characters.' : 'Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
      } else {
        setMessage('Password updated successfully. Redirecting to login...')
        await supabase.auth.signOut()
        setTimeout(() => router.replace('/login'), 1000)
      }
    } catch {
      setError('Unable to update password. Please request a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">Use at least 6 characters.</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          {!ready ? (
            <p className="text-sm text-destructive">This reset link is invalid or has expired. Request a new one.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required placeholder="New password" className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={6} required placeholder="Confirm password" className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-primary">{message}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
