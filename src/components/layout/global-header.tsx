'use client'

import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { OrganizationSwitcher } from './organization-switcher'
import { DomainSwitcher } from './domain-switcher'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Moon, Sun, User, LogOut, Settings, Bell, Bot } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UserData {
  id: string
  email: string
}

interface GlobalHeaderProps {
  onAIWorkspaceOpen?: () => void
}

export function GlobalHeader({ onAIWorkspaceOpen }: GlobalHeaderProps) {
  const { setTheme, theme } = useTheme()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/me')
        if (res.ok) {
          const json = await res.json()
          if (json.data) {
            setUser({
              id: json.data.id || json.data.userId,
              email: json.data.email || '',
            })
          }
        }
      } catch {
        // Not authenticated
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  async function handleSignOut() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'M'

  const displayName = user?.email || (loading ? 'Loading...' : 'Guest')
  const displayEmail = user?.email || ''

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4" role="banner">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <OrganizationSwitcher />
      <DomainSwitcher />
      <div className="ml-auto flex items-center gap-1">
        {onAIWorkspaceOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onAIWorkspaceOpen}
            aria-label="AI Assistant"
          >
            <Bot className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {displayEmail && (
                  <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <User className="mr-2 h-4 w-4" />Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
