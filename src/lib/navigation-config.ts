// Navigation configuration — defines all sidebar/header navigation items
// Used by AppSidebar and can be filtered by permissions

import type { LucideIcon } from 'lucide-react'
import {
  Home, Building2, Blocks, Bot, Workflow,
  BarChart3, Globe, Users, CreditCard, Settings, Activity,
} from 'lucide-react'

export interface NavItem {
  id: string
  title: string
  icon: LucideIcon
  href: string
  permission?: string
  badge?: string | null
  children?: NavItem[]
}

export const coreNavItems: NavItem[] = [
  { id: 'home', title: 'Home', icon: Home, href: '#home', permission: undefined },
  { id: 'business', title: 'My Business', icon: Building2, href: '#business', permission: 'organization.view' },
  { id: 'domains', title: 'Domains', icon: Blocks, href: '#domains', permission: 'domain.view' },
  { id: 'ai', title: 'AI', icon: Bot, href: '#ai', permission: 'ai.conversation.view' },
  { id: 'automations', title: 'Automations', icon: Workflow, href: '#automations', permission: 'workflow.view' },
  { id: 'analytics', title: 'Analytics', icon: BarChart3, href: '#analytics', permission: 'organization.view' },
  { id: 'integrations', title: 'Integrations', icon: Globe, href: '#integrations', permission: 'integration.view' },
  { id: 'team', title: 'Team', icon: Users, href: '#team', permission: 'membership.view' },
  { id: 'billing', title: 'Billing', icon: CreditCard, href: '#billing', permission: 'billing.view' },
  { id: 'settings', title: 'Settings', icon: Settings, href: '#settings', permission: 'organization.update' },
]

// Command Center nav items (super admin)
export const commandCenterNavItems: NavItem[] = [
  { id: 'cc-orgs', title: 'Organizations', icon: Building2, href: '#cc-orgs' },
  { id: 'cc-domains', title: 'Domains', icon: Blocks, href: '#cc-domains' },
  { id: 'cc-users', title: 'Users', icon: Users, href: '#cc-users' },
  { id: 'cc-subscriptions', title: 'Subscriptions', icon: CreditCard, href: '#cc-subscriptions' },
  { id: 'cc-usage', title: 'AI Usage', icon: BarChart3, href: '#cc-usage' },
  { id: 'cc-health', title: 'System Health', icon: Activity, href: '#cc-health' },
  { id: 'cc-audit', title: 'Audit Logs', icon: Settings, href: '#cc-audit' },
  { id: 'cc-incidents', title: 'Incidents', icon: Workflow, href: '#cc-incidents' },
]