// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Agent Config Service
// CRUD operations for organization-level custom AI agents
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { isSystemAgent } from './agents'

export interface CreateAgentConfigData {
  organizationId: string
  slug: string
  name: string
  description?: string
  systemPrompt: string
  model: string
  provider: string
  temperature?: number
  maxTokens?: number
  tools?: string[]
}

export interface UpdateAgentConfigData {
  name?: string
  description?: string
  systemPrompt?: string
  model?: string
  provider?: string
  temperature?: number
  maxTokens?: number
  tools?: string[]
  status?: string
}

/** Create a new custom agent for an organization */
export async function createAgentConfig(data: CreateAgentConfigData) {
  // Prevent using system agent slugs
  if (isSystemAgent(data.slug)) {
    throw new Error(`Cannot use reserved system agent slug: ${data.slug}`)
  }

  // Validate slug format
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(data.slug) || data.slug.length > 48) {
    throw new Error('Agent slug must be 2-48 chars, lowercase alphanumeric with hyphens')
  }

  // Validate required fields
  if (!data.systemPrompt?.trim()) {
    throw new Error('systemPrompt is required')
  }
  if (!data.model?.trim()) {
    throw new Error('model is required')
  }
  if (!['openai', 'anthropic', 'google'].includes(data.provider)) {
    throw new Error('provider must be openai, anthropic, or google')
  }

  return db.agentConfig.create({
    data: {
      organizationId: data.organizationId,
      slug: data.slug,
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
      model: data.model,
      provider: data.provider,
      temperature: data.temperature ?? 0.7,
      maxTokens: data.maxTokens ?? 4096,
      tools: data.tools ? JSON.stringify(data.tools) : null,
    },
  })
}

/** List all agent configs for an organization */
export async function listAgentConfigs(organizationId: string) {
  return db.agentConfig.findMany({
    where: { organizationId },
    select: {
      id: true, slug: true, name: true, description: true,
      model: true, provider: true, temperature: true,
      maxTokens: true, tools: true, status: true, createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Get a single agent config by slug */
export async function getAgentConfig(organizationId: string, slug: string) {
  return db.agentConfig.findFirst({
    where: { organizationId, slug, status: 'active' },
    select: {
      id: true, slug: true, name: true, description: true,
      model: true, provider: true, temperature: true,
      maxTokens: true, tools: true, status: true, createdAt: true, updatedAt: true,
    },
  })
}

/** Update an agent config */
export async function updateAgentConfig(
  organizationId: string,
  slug: string,
  data: UpdateAgentConfigData
) {
  const existing = await db.agentConfig.findFirst({
    where: { organizationId, slug },
  })
  if (!existing) throw new Error(`Agent config '${slug}' not found`)

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt
  if (data.model !== undefined) updateData.model = data.model
  if (data.provider !== undefined) {
    if (!['openai', 'anthropic', 'google'].includes(data.provider)) {
      throw new Error('provider must be openai, anthropic, or google')
    }
    updateData.provider = data.provider
  }
  if (data.temperature !== undefined) {
    updateData.temperature = Math.max(0, Math.min(2, data.temperature))
  }
  if (data.maxTokens !== undefined) {
    updateData.maxTokens = Math.max(64, Math.min(128000, data.maxTokens))
  }
  if (data.tools !== undefined) {
    updateData.tools = JSON.stringify(data.tools)
  }
  if (data.status !== undefined) {
    if (!['active', 'disabled', 'archived'].includes(data.status)) {
      throw new Error('status must be active, disabled, or archived')
    }
    updateData.status = data.status
  }

  return db.agentConfig.update({
    where: { id: existing.id },
    data: updateData,
  })
}

/** Delete (archive) an agent config */
export async function deleteAgentConfig(organizationId: string, slug: string) {
  const existing = await db.agentConfig.findFirst({
    where: { organizationId, slug },
  })
  if (!existing) throw new Error(`Agent config '${slug}' not found`)

  return db.agentConfig.update({
    where: { id: existing.id },
    data: { status: 'archived' },
  })
}

/** Resolve an agent (system or custom) for chat execution */
export async function resolveAgent(organizationId: string, agentSlug: string) {
  // Check system agents first
  if (isSystemAgent(agentSlug)) {
    const { getSystemAgent } = await import('./agents')
    const system = getSystemAgent(agentSlug)
    if (system) return { ...system, isCustom: false }
  }

  // Fall back to org custom agent
  const custom = await getAgentConfig(organizationId, agentSlug)
  if (custom) {
    const { getSystemAgent } = await import('./agents')
    // Use the custom agent's system prompt and model, but merge with system agent tools if needed
    return {
      slug: custom.slug,
      name: custom.name,
      description: custom.description,
      systemPrompt: custom.systemPrompt,
      model: custom.model,
      provider: custom.provider as 'openai' | 'anthropic' | 'google',
      temperature: custom.temperature,
      maxTokens: custom.maxTokens,
      tools: custom.tools ? JSON.parse(custom.tools) as string[] : undefined,
      isCustom: true,
    }
  }

  return null
}
