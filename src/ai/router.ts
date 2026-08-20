// ══════════════════════════════════════════════════════════════════
// MIANX.AI — AI Router
// Provider-agnostic model routing with fallback and cost awareness
// ══════════════════════════════════════════════════════════════════

import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'
import type { AIProvider, RegisteredModel, ModelId } from './types'

// ── Provider Client Singletons ──

let _openai: ReturnType<typeof createOpenAI> | null = null
let _anthropic: ReturnType<typeof createAnthropic> | null = null
let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null

function getOpenAI() {
  if (!_openai) _openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

function getAnthropic() {
  if (!_anthropic) _anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

function getGoogle() {
  if (!_google) _google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
  return _google
}

// ── Model Registry ──

const MODEL_REGISTRY: RegisteredModel[] = [
  // OpenAI
  {
    id: 'gpt-4o-mini', provider: 'openai', displayName: 'GPT-4o Mini',
    capabilities: { streaming: true, toolUse: true, vision: true, structuredOutput: true, maxContextTokens: 128000, maxOutputTokens: 16384 },
    costPer1kIn: 0.00015, costPer1kOut: 0.0006, tier: 'free',
  },
  {
    id: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o',
    capabilities: { streaming: true, toolUse: true, vision: true, structuredOutput: true, maxContextTokens: 128000, maxOutputTokens: 16384 },
    costPer1kIn: 0.0025, costPer1kOut: 0.01, tier: 'standard',
  },
  {
    id: 'o3-mini', provider: 'openai', displayName: 'o3-mini',
    capabilities: { streaming: true, toolUse: true, vision: false, structuredOutput: true, maxContextTokens: 200000, maxOutputTokens: 100000 },
    costPer1kIn: 0.0011, costPer1kOut: 0.0044, tier: 'standard',
  },
  // Anthropic
  {
    id: 'claude-sonnet-4-20250514', provider: 'anthropic', displayName: 'Claude Sonnet 4',
    capabilities: { streaming: true, toolUse: true, vision: true, structuredOutput: true, maxContextTokens: 200000, maxOutputTokens: 16000 },
    costPer1kIn: 0.003, costPer1kOut: 0.015, tier: 'standard',
  },
  {
    id: 'claude-haiku-4-20250414', provider: 'anthropic', displayName: 'Claude Haiku 4',
    capabilities: { streaming: true, toolUse: true, vision: true, structuredOutput: true, maxContextTokens: 200000, maxOutputTokens: 8192 },
    costPer1kIn: 0.0008, costPer1kOut: 0.004, tier: 'free',
  },
  // Google
  {
    id: 'gemini-2.0-flash', provider: 'google', displayName: 'Gemini 2.0 Flash',
    capabilities: { streaming: true, toolUse: true, vision: true, structuredOutput: true, maxContextTokens: 1048576, maxOutputTokens: 65536 },
    costPer1kIn: 0.0001, costPer1kOut: 0.0004, tier: 'free',
  },
  {
    id: 'gemini-2.5-pro-preview-05-06', provider: 'google', displayName: 'Gemini 2.5 Pro',
    capabilities: { streaming: true, toolUse: true, vision: true, structuredOutput: true, maxContextTokens: 1048576, maxOutputTokens: 65536 },
    costPer1kIn: 0.00125, costPer1kOut: 0.01, tier: 'standard',
  },
]

/** Get all registered models */
export function listModels(tier?: 'free' | 'standard' | 'premium'): RegisteredModel[] {
  if (tier) return MODEL_REGISTRY.filter(m => m.tier === tier || m.tier === 'free')
  return [...MODEL_REGISTRY]
}

/** Get a specific model from the registry */
export function getModel(id: string): RegisteredModel | undefined {
  return MODEL_REGISTRY.find(m => m.id === id)
}

/** Get the default model for an org (tier-based) */
export function getDefaultModel(tier: 'free' | 'standard' | 'premium' = 'free'): RegisteredModel {
  return MODEL_REGISTRY.find(m => m.tier === tier) ?? MODEL_REGISTRY[0]
}

/** Parse a model string like 'openai/gpt-4o' or just 'gpt-4o' into provider + model */
export function parseModelId(input: string): ModelId | null {
  // Format: 'provider/model'
  if (input.includes('/')) {
    const [provider, model] = input.split('/', 2)
    if (provider === 'openai' || provider === 'anthropic' || provider === 'google') {
      return { provider, model }
    }
  }
  // Lookup by model ID
  const registered = MODEL_REGISTRY.find(m => m.id === input)
  if (registered) return { provider: registered.provider, model: registered.id }
  return null
}

/** Get a Vercel AI SDK LanguageModel instance for a provider/model */
export function getLanguageModel(provider: AIProvider, modelId: string): LanguageModel {
  switch (provider) {
    case 'openai':
      return getOpenAI()(modelId)
    case 'anthropic':
      return getAnthropic()(modelId)
    case 'google':
      return getGoogle()(modelId)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/** Check if a provider has its API key configured */
export function isProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case 'openai': return !!process.env.OPENAI_API_KEY
    case 'anthropic': return !!process.env.ANTHROPIC_API_KEY
    case 'google': return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    default: return false
  }
}

/** Get all configured providers */
export function getConfiguredProviders(): { provider: AIProvider; models: RegisteredModel[] }[] {
  return (['openai', 'anthropic', 'google'] as AIProvider[])
    .filter(isProviderConfigured)
    .map(provider => ({
      provider,
      models: MODEL_REGISTRY.filter(m => m.provider === provider),
    }))
}
