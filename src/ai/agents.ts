// ══════════════════════════════════════════════════════
// MIANX.AI — Agent Registry
// System agents + org-configurable agents
// ══════════════════════════════════════════════════════════════════

import type { AgentDefinition } from './types'

// ── System Agents (always available) ──

export const SYSTEM_AGENTS: AgentDefinition[] = [
  {
    slug: 'general-assistant',
    name: 'General Assistant',
    description: 'A helpful AI assistant with access to your organization data. Can answer questions about members, domains, modules, and audit logs.',
    systemPrompt: `You are Mianx.ai's General Assistant. You help users understand their organization's data and configuration.

You have access to tools that query the organization's data in real-time. Use them to provide accurate, up-to-date answers.

Rules:
- Always use tools when the user asks about organization data
- Be concise and actionable
- If you don't have a tool for something, say so honestly
- Respond in the same language the user writes in
- Never make up data — only report what tools return`,
    model: 'gpt-4o-mini',
    provider: 'openai',
    temperature: 0.7,
    maxTokens: 4096,
    tools: ['list_organizations', 'list_active_domains', 'list_active_modules', 'list_organization_members', 'get_organization_stats', 'search_audit_logs'],
    icon: 'Bot',
  },
  {
    slug: 'analyst',
    name: 'Business Analyst',
    description: 'Analyzes organization usage patterns, member activity, and system health. Good for reports and insights.',
    systemPrompt: `You are Mianx.ai's Business Analyst. You specialize in analyzing organization data and providing actionable insights.

When asked for analysis:
1. First gather data using available tools
2. Look for patterns, trends, and anomalies
3. Provide specific, numbered recommendations
4. Always ground your analysis in the actual data returned by tools`,
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    temperature: 0.3,
    maxTokens: 8192,
    tools: ['get_organization_stats', 'list_organization_members', 'list_active_domains', 'list_active_modules', 'search_audit_logs'],
    icon: 'BarChart3',
  },
]

/** Get a system agent by slug */
export function getSystemAgent(slug: string): AgentDefinition | undefined {
  return SYSTEM_AGENTS.find(a => a.slug === slug)
}

/** List all system agents */
export function listSystemAgents(): AgentDefinition[] {
  return [...SYSTEM_AGENTS]
}

/** Check if a slug belongs to a system agent */
export function isSystemAgent(slug: string): boolean {
  return SYSTEM_AGENTS.some(a => a.slug === slug)
}
