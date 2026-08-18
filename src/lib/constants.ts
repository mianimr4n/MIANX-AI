// ══════════════════════════════════════════════════════════════════
// MIANX.AI — System Constants
// ══════════════════════════════════════════════════════════════════

export const APP_NAME = 'Mianx.ai'
export const APP_VERSION = '0.6.0'
export const APP_DESCRIPTION = 'Multi-Tenant, Multi-Domain, AI-Native Business Operating System'

export const PHASES = [
  { id: 0, name: 'Project Foundation', duration: 'Week 1-2', status: 'completed' as const, focus: 'Setup and scaffolding' },
  { id: 1, name: 'Database and Tenancy', duration: 'Week 2-4', status: 'completed' as const, focus: 'PostgreSQL schema and RLS' },
  { id: 2, name: 'Identity and Authorization', duration: 'Week 4-6', status: 'completed' as const, focus: 'Auth, RBAC, permissions' },
  { id: 3, name: 'Domain and Module Engine', duration: 'Week 6-8', status: 'completed' as const, focus: 'Domain registry, manifests' },
  { id: 4, name: 'AI Core Foundation', duration: 'Week 8-12', status: 'completed' as const, focus: 'AI router, agents, tools' },
  { id: 5, name: 'Event and Automation', duration: 'Week 12-14', status: 'completed' as const, focus: 'Events, workflows, jobs' },
  { id: 6, name: 'API and Integration', duration: 'Week 14-16', status: 'completed' as const, focus: 'APIs, webhooks, OAuth' },
  { id: 7, name: 'Billing and Entitlements', duration: 'Week 16-18', status: 'completed' as const, focus: 'Plans, subscriptions, usage' },
  { id: 8, name: 'Frontend Platform', duration: 'Week 18-22', status: 'pending' as const, focus: 'App shell, design system' },
  { id: 9, name: 'Observability and Ops', duration: 'Week 22-24', status: 'pending' as const, focus: 'Logging, monitoring, alerts' },
  { id: 10, name: 'Poultry OS Domain', duration: 'Week 24-30', status: 'pending' as const, focus: 'Industry modules, agents' },
  { id: 11, name: 'Production Readiness', duration: 'Week 30-32', status: 'pending' as const, focus: 'Security, testing, deploy' },
] as const

export const CORE_TABLES = [
  'organizations', 'profiles', 'organization_memberships',
  'teams', 'team_members', 'roles', 'permissions',
  'role_permissions', 'membership_roles', 'settings',
  'files', 'audit_logs', 'notifications',
] as const

export const DOMAIN_TABLES = [
  'domains', 'organization_domains', 'modules', 'organization_modules',
] as const

export const ARCHITECTURE_LAYERS = [
  { name: 'Frontend', tech: 'Next.js 16 + React 19 + TypeScript', icon: 'monitor' },
  { name: 'API Layer', tech: 'REST + Webhooks + WebSocket', icon: 'globe' },
  { name: 'Authorization', tech: 'RBAC + ABAC + RLS', icon: 'shield' },
  { name: 'Domain Engine', tech: 'Manifest-based Plugins', icon: 'blocks' },
  { name: 'AI Core', tech: 'Provider-agnostic Router', icon: 'brain' },
  { name: 'Automation', tech: 'Events + Workflows + Jobs', icon: 'workflow' },
  { name: 'Database', tech: 'PostgreSQL + Prisma ORM', icon: 'database' },
] as const

export const AI_TABLES = [
  'conversations', 'ai_messages', 'agent_configs',
] as const

export const AUTOMATION_TABLES = [
  'events', 'workflows', 'workflow_runs', 'workflow_step_runs', 'jobs', 'approvals',
] as const

export const INTEGRATION_TABLES = [
  'api_keys', 'webhooks', 'webhook_deliveries', 'oauth_connections',
] as const

export const BILLING_TABLES = [
  'plans', 'plan_versions', 'features', 'subscriptions',
  'usage_meters', 'usage_records', 'invoices',
] as const

export const SYSTEM_ROLES = ['owner', 'admin', 'member', 'viewer'] as const

export const PERMISSION_FORMAT = 'domain.resource.action'
