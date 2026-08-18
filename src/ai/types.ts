// ══════════════════════════════════════════════════════════════════
// MIANX.AI — AI Core Types
// Provider-agnostic type definitions for the AI router
// ══════════════════════════════════════════════════════════════════

/** Supported AI providers */
export type AIProvider = 'openai' | 'anthropic' | 'google'

/** A provider-specific model identifier */
export interface ModelId {
  provider: AIProvider
  model: string
}

/** Capabilities a model might support */
export interface ModelCapabilities {
  streaming: boolean
  toolUse: boolean
  vision: boolean
  structuredOutput: boolean
  maxContextTokens: number
  maxOutputTokens: number
}

/** A model registered in the router */
export interface RegisteredModel {
  id: string            // e.g. 'gpt-4o', 'claude-sonnet-4-20250514'
  provider: AIProvider
  displayName: string
  capabilities: ModelCapabilities
  costPer1kIn?: number  // USD per 1K input tokens
  costPer1kOut?: number // USD per 1K output tokens
  tier: 'free' | 'standard' | 'premium'
}

/** Chat message as stored/transmitted */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolCalls?: ToolCall[]
}

/** A tool call from the LLM */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/** Tool definition for the AI SDK */
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<string>
}

/** Context passed to tool execution */
export interface ToolContext {
  organizationId: string
  userId: string
  membershipId: string
  roles: string[]
}

/** Options for a chat completion request */
export interface ChatOptions {
  model?: string
  provider?: AIProvider
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  tools?: ToolDefinition[]
  conversationId?: string
  metadata?: Record<string, unknown>
}

/** Result from a non-streaming chat completion */
export interface ChatResult {
  content: string
  toolCalls: ToolCall[]
  model: string
  provider: AIProvider
  tokensIn: number
  tokensOut: number
  latencyMs: number
  conversationId: string
  messageId: string
}

/** Agent definition */
export interface AgentDefinition {
  slug: string
  name: string
  description?: string
  systemPrompt: string
  model: string
  provider: AIProvider
  temperature?: number
  maxTokens?: number
  tools?: string[]  // tool names this agent can use
  icon?: string
}

/** Usage statistics for an organization */
export interface AIUsageStats {
  totalConversations: number
  totalMessages: number
  totalTokensIn: number
  totalTokensOut: number
  avgLatencyMs: number
  byProvider: Record<string, { messages: number; tokensIn: number; tokensOut: number }>
  byModel: Record<string, { messages: number; tokensIn: number; tokensOut: number }>
}
