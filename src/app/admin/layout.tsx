'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin' },
  { label: 'Organizations', href: '/admin/organizations' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Domains', href: '/admin/domains' },
  { label: 'Revenue', href: '/admin/revenue' },
  { label: 'Health', href: '/admin/health' },
  { label: 'Audit', href: '/admin/audit' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function check() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          window.location.href = '/login'
          return
        }
        setEmail(session.user.email ?? '')
        // Verify platform admin via dedicated check endpoint
        const res = await fetch('/api/admin/check')
        if (res.ok) {
          const data = await res.json()
          if (data.isAdmin) {
            setAuthorized(true)
          } else {
            setAuthorized(false)
          }
        } else if (res.status === 401) {
          window.location.href = '/login'
        } else {
          setAuthorized(false)
        }
      } catch {
        setAuthorized(false)
      }
    }
    check()
  }, [])

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Verifying admin access...</div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Platform admin access is required. Your account ({email}) is not configured as a platform administrator.
          </p>
          <Link href="/app" className="text-sm text-primary hover:underline">Return to App</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin sidebar */}
      <aside className="w-56 border-r bg-card p-4 hidden md:block">
        <div className="flex items-center gap-2 mb-6 px-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold">Admin</span>
        </div>
        <nav className="space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t">
          <Link href="/app" className="block text-sm text-muted-foreground hover:text-foreground px-3 py-2">
            Back to App
          </Link>
        </div>
      </aside>
      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t p-2">
        <div className="flex overflow-x-auto gap-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3 py-2 rounded-md text-xs transition-colors ${
                pathname === item.href
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  )
}
