// ══════════════════════════════════════════════════════
// MIANX.AI — Tool Registry
// Defines tools that AI agents can invoke
// ══════════════════════════════════════════════════════

import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db'
import type { ToolDefinition, ToolContext } from './types'

// ── Tool Definitions ──

const listOrganizationsTool: ToolDefinition = {
  name: 'list_organizations',
  description: 'List all organizations the user has access to. Returns org names, slugs, and member counts.',
  parameters: {},
  requiredPermission: 'organization.view',
  async execute(_args, ctx) {
    const memberships = await db.organizationMembership.findMany({
      where: { userId: ctx.userId, status: 'active' },
      include: { organization: { select: { id: true, name: true, slug: true, status: true } } },
    })
    return JSON.stringify(memberships.map(m => ({ id: m.organization.id, name: m.organization.name, slug: m.organization.slug, status: m.organization.status })))
  },
}

const listDomainsTool: ToolDefinition = {
  name: 'list_active_domains',
  description: 'List all domains activated for the current organization with their module counts.',
  parameters: {},
  requiredPermission: 'domain.view',
  async execute(_args, ctx) {
    const orgDomains = await db.organizationDomain.findMany({
      where: { organizationId: ctx.organizationId, status: 'active' },
      include: { domain: { include: { _count: { select: { modules: true } } } } },
    })
    return JSON.stringify(orgDomains.map(od => ({ name: od.domain.name, slug: od.domain.slug, version: od.domain.version, moduleCount: od.domain._count.modules })))
  },
}

const listModulesTool: ToolDefinition = {
  name: 'list_active_modules',
  description: 'List all modules currently active for the organization, grouped by domain.',
  parameters: {},
  requiredPermission: 'module.view',
  async execute(_args, ctx) {
    const orgModules = await db.organizationModule.findMany({
      where: { organizationId: ctx.organizationId, status: 'active' },
      include: { module: { include: { domain: { select: { name: true, slug: true } } } } },
    })
    return JSON.stringify(orgModules.map(om => ({ module: om.module.name, domain: om.module.domain.name, status: om.status })))
  },
}

const listMembersTool: ToolDefinition = {
  name: 'list_organization_members',
  description: 'List all members of the current organization with their roles.',
  parameters: {},
  requiredPermission: 'member.view',
  async execute(_args, ctx) {
    const memberships = await db.organizationMembership.findMany({
      where: { organizationId: ctx.organizationId, status: 'active' },
      include: {
        roles: { include: { role: { select: { name: true, slug: true } } } },
        profile: { select: { displayName: true } },
      },
    })
    return JSON.stringify(memberships.map(m => ({ user: m.profile.displayName, roles: m.roles.map(r => r.role.slug) })))
  },
}

const getOrgStatsTool: ToolDefinition = {
  name: 'get_organization_stats',
  description: 'Get statistics about the current organization: member count, team count, active domains, active modules.',
  parameters: {},
  requiredPermission: 'organization.view',
  async execute(_args, ctx) {
    const [members, teams, domains, modules] = await Promise.all([
      db.organizationMembership.count({ where: { organizationId: ctx.organizationId, status: 'active' } }),
      db.team.count({ where: { organizationId: ctx.organizationId } }),
      db.organizationDomain.count({ where: { organizationId: ctx.organizationId, status: 'active' } }),
      db.organizationModule.count({ where: { organizationId: ctx.organizationId, status: 'active' } }),
    ])
    return JSON.stringify({ members, teams, activeDomains: domains, activeModules: modules })
  },
}

const searchAuditLogsTool: ToolDefinition = {
  name: 'search_audit_logs',
  description: 'Search recent audit logs for the organization. Returns the most recent 20 entries matching the optional action filter.',
  parameters: {
    type: 'object',
    properties: { action: { type: 'string', description: 'Filter by action (e.g. "create", "update", "delete")' } },
  },
  requiredPermission: 'audit.view',
  async execute(args, ctx) {
    const where: Record<string, unknown> = { organizationId: ctx.organizationId }
    if (args.action) where.action = { contains: String(args.action) }
    const logs = await db.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 20,
      select: { action: true, resourceType: true, actorType: true, actorId: true, createdAt: true },
    })
    return JSON.stringify(logs)
  },
}

// ── Registry ──

const ALL_TOOLS: ToolDefinition[] = [
  listOrganizationsTool,
  listDomainsTool,
  listModulesTool,
  listMembersTool,
  getOrgStatsTool,
  searchAuditLogsTool,
]

const toolMap = new Map(ALL_TOOLS.map(t => [t.name, t]))

/** Get all registered tool definitions */
export function listTools(): ToolDefinition[] {
  return [...ALL_TOOLS]
}

/** Get a specific tool by name */
export function getTool(name: string): ToolDefinition | undefined {
  return toolMap.get(name)
}

/** Get tools by names (for agent configs) */
export function getToolsByNames(names: string[]): ToolDefinition[] {
  return names.map(n => toolMap.get(n)).filter(Boolean) as ToolDefinition[]
}

/** Check if a user has a specific permission (wildcard-aware) */
function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes('*')) return true
  if (permissions.includes(required)) return true
  // Check wildcard patterns: e.g. '*.view' or 'audit.*'
  const parts = required.split('.')
  for (const perm of permissions) {
    const pp = perm.split('.')
    if (pp.length !== parts.length) continue
    const match = pp.every((p, i) => p === '*' || p === parts[i])
    if (match) return true
  }
  return false
}

/** Filter tools based on user permissions — removes tools the user can't access */
export function filterToolsByPermission(tools: ToolDefinition[], permissions: string[]): ToolDefinition[] {
  return tools.filter(t => {
    if (!t.requiredPermission) return true  // No permission required
    return hasPermission(permissions, t.requiredPermission)
  })
}

/** Convert tool definitions to AI SDK tool objects */
export function toAISDKTools(tools: ToolDefinition[], context: ToolContext) {
  const result: Record<string, ReturnType<typeof tool>> = {}
  for (const t of tools) {
    result[t.name] = tool({
      description: t.description,
      parameters: z.object(t.parameters?.properties ? Object.fromEntries(
        Object.entries(t.parameters.properties as Record<string, { type: string; description?: string }>).map(([k, v]) => {
          let schema: z.ZodTypeAny = z.string()
          if (v.type === 'number') schema = z.number()
          else if (v.type === 'boolean') schema = z.boolean()
          else if (v.type === 'array') schema = z.array(z.unknown())
          return [k, schema.optional()]
        })
      ) : {}),
      execute: async (args) => {
        const raw = args as Record<string, unknown>
        // Permission gate at execution time (defense in depth)
        if (t.requiredPermission && !hasPermission(context.permissions, t.requiredPermission)) {
          return JSON.stringify({ error: `Permission denied: ${t.requiredPermission} required` })
        }
        return t.execute(raw, context)
      },
    })
  }
  return result
}
