'use client'

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

interface NavItem {
  title: string
  icon: React.ElementType
  permission?: string
  href: string
  active?: boolean
}

const navItems: NavItem[] = [
  { title: 'Home', icon: Home, href: '#home', active: true },
  { title: 'My Business', icon: Building2, permission: 'organization.view', href: '#business' },
  { title: 'Domains', icon: Blocks, permission: 'domain.view', href: '#domains' },
  { title: 'AI', icon: Bot, permission: 'ai.conversation.view', href: '#ai' },
  { title: 'Automations', icon: Workflow, permission: 'workflow.view', href: '#automations' },
  { title: 'Analytics', icon: BarChart3, permission: 'organization.view', href: '#analytics' },
  { title: 'Integrations', icon: Globe, permission: 'integration.view', href: '#integrations' },
  { title: 'Team', icon: Users, permission: 'membership.view', href: '#team' },
  { title: 'Billing', icon: CreditCard, permission: 'billing.view', href: '#billing' },
  { title: 'Settings', icon: Settings, permission: 'organization.update', href: '#settings' },
]

export function AppSidebar() {
  const { hasPermission, permissions } = usePermissions()

  const visibleItems = navItems.filter(
    (item) => !item.permission || permissions.length === 0 || hasPermission(item.permission)
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">Mianx.ai</span>
        </div>
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
                    isActive={item.active}
                    tooltip={item.title}
                  >
                    <a href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.8.0 — Phase 8 ✅
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
