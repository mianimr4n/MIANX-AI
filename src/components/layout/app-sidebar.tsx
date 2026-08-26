'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Home, Building2, Blocks, Bot, Workflow,
  BarChart3, Globe, Users, CreditCard, Settings, Activity,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { APP_VERSION } from '@/lib/constants'

interface NavItem {
  title: string
  icon: React.ElementType
  permission?: string
  href: string
}

const navItems: NavItem[] = [
  { title: 'Home', icon: Home, href: '/app' },
  { title: 'My Business', icon: Building2, permission: 'organization.view', href: '/app/business' },
  { title: 'Domains', icon: Blocks, permission: 'domain.view', href: '/app/domains' },
  { title: 'AI', icon: Bot, permission: 'ai.conversation.view', href: '/app/ai' },
  { title: 'Automations', icon: Workflow, permission: 'workflow.view', href: '/app/automations' },
  { title: 'Analytics', icon: BarChart3, permission: 'organization.view', href: '/app/analytics' },
  { title: 'Integrations', icon: Globe, permission: 'integration.view', href: '/app/integrations' },
  { title: 'Team', icon: Users, permission: 'membership.view', href: '/app/team' },
  { title: 'Billing', icon: CreditCard, permission: 'billing.view', href: '/app/billing' },
  { title: 'Settings', icon: Settings, permission: 'organization.update', href: '/app/settings' },
]

export function AppSidebar() {
  const { hasPermission, permissions, activeOrganization, permissionsLoaded } = usePermissions()
  const pathname = usePathname()

  // - Items without permission requirements always show (e.g. Home)
  // - Items with permission requirements show only when:
  //   a) No organization is selected yet (user needs to see what's available)
  //   b) Organization is selected, permissions loaded, and user has the permission
  // - Hide permission-gated items if org is selected but permissions are still loading
  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true
    if (!activeOrganization) return true
    if (!permissionsLoaded) return false
    return hasPermission(item.permission)
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        <Link href="/app" className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md transition-colors">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">Mianx.ai</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href))}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v{APP_VERSION}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
