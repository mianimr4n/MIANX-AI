'use client'

import { AppShell } from '@/components/layout'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthenticated(true)
      } else {
        window.location.href = '/login'
      }
      setChecked(true)
    })
  }, [])

  // Listen for auth state changes (sign out)
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthenticated(true)
      } else {
        window.location.href = '/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Don't render the app shell until auth is confirmed
  // This prevents the flash of unauthenticated app content
  if (!checked || !authenticated) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
