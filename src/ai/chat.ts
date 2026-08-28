// ══════════════════════════════════════════════════════
// MIANX.AI — Chat Engine
// Orchestrates AI completions with tools, memory, and agent config
// Phase 11: Added AI guards, max tokens cap, history limit
// ══════════════════════════════════════════════════════════════════

import { streamText } from 'ai'
import type { AIProvider, ChatOptions, ToolContext } from './types'
import { getLanguageModel, parseModelId, getDefaultModel, isProviderConfigured } from './router'
import { getToolsByNames, toAISDKTools, listTools, filterToolsByPermission } from './tools'
import { createConversation, addMessage, getConversationMessages } from './memory'
import { getSystemAgent } from './agents'
import { AI_MAX_TOKENS, AI_MAX_HISTORY_MESSAGES, checkAILimits, recordAIUsage, validateAIInput, createAITimeout } from './guards'

/** Resolve the model to use: explicit > agent config (custom/system) > default */
async function resolveModel(opts: ChatOptions, context: ToolContext): Promise<{ provider: AIProvider; model: string }> {
  if (opts.provider && opts.model) return { provider: opts.provider, model: opts.model }
  if (opts.model) {
    const parsed = parseModelId(opts.model)
    if (parsed) return parsed
  }
  // Check agent config for model preference
  if (opts.metadata?.agentSlug) {
    const { resolveAgent } = await import('./agent-config')
    const agent = await resolveAgent(context.organizationId, opts.metadata.agentSlug as string)
    if (agent?.model && agent?.provider) {
      return { provider: agent.provider as AIProvider, model: agent.model }
    }
  }
  // Fall back to default
  const def = getDefaultModel()
  return { provider: def.provider, model: def.id }
}

/** Resolve system prompt: explicit > custom agent > system agent > generic */
async function resolveSystemPrompt(opts: ChatOptions, context: ToolContext): Promise<string> {
  if (opts.systemPrompt) return opts.systemPrompt
  if (opts.metadata?.agentSlug) {
    const { resolveAgent } = await import('./agent-config')
    const agent = await resolveAgent(context.organizationId, opts.metadata.agentSlug as string)
    if (agent) return agent.systemPrompt
  }
  return 'You are a helpful assistant for Mianx.ai, an AI-Native Business Operating System. Help the user with their organization data and configuration.'
}

/** Resolve tools: explicit agent config (custom > system) > all available, filtered by permissions */
async function resolveTools(opts: ChatOptions, context: ToolContext) {
  let toolNames: string[] | undefined
  if (opts.metadata?.agentSlug) {
    const { resolveAgent } = await import('./agent-config')
    const agent = await resolveAgent(context.organizationId, opts.metadata.agentSlug as string)
    toolNames = agent?.tools
    if (!toolNames) {
      const systemAgent = getSystemAgent(opts.metadata.agentSlug as string)
      toolNames = systemAgent?.tools
    }
  }
  let tools = toolNames ? getToolsByNames(toolNames) : listTools()
  tools = filterToolsByPermission(tools, context.permissions)
  return toAISDKTools(tools, context)
}

/** Create a streaming chat response using Vercel AI SDK */
export async function streamChat(opts: ChatOptions, context: ToolContext, currentMessage?: string) {
  // Phase 11: Validate input
  if (currentMessage) {
    const inputCheck = validateAIInput(currentMessage)
    if (!inputCheck.valid) {
      throw new Error(inputCheck.reason)
    }
  }

  // Phase 11: Check org AI limits
  const estimatedTokens = (currentMessage?.length || 0) * 2 // rough estimate
  const limitCheck = checkAILimits(context.organizationId, estimatedTokens)
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason)
  }

  const { provider, model } = await resolveModel(opts, context)

  if (!isProviderConfigured(provider)) {
    const configured = (['openai', 'anthropic', 'google'] as AIProvider[])
      .filter(isProviderConfigured)
    if (configured.length > 0) {
      const fallback = getDefaultModel()
      return executeStream({ ...opts, provider: fallback.provider, model: fallback.id }, context, currentMessage)
    }
    throw new Error(`No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env`)
  }

  return executeStream({ ...opts, provider, model }, context, currentMessage)
}

async function executeStream(opts: ChatOptions & { provider: AIProvider; model: string }, context: ToolContext, currentMessage?: string) {
  const systemPrompt = await resolveSystemPrompt(opts, context)
  const aiTools = await resolveTools(opts, context)
  const languageModel = getLanguageModel(opts.provider, opts.model)

  // Build messages from conversation history + current user message
  let messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
  if (opts.conversationId) {
    const history = await getConversationMessages(opts.conversationId)
    // Phase 11: Limit history to prevent context bloat; only user/assistant messages
    const trimmedHistory = history.length > AI_MAX_HISTORY_MESSAGES
      ? history.slice(-AI_MAX_HISTORY_MESSAGES)
      : history
    messages = trimmedHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  }
  if (currentMessage) {
    messages.push({ role: 'user', content: currentMessage })
  }

  // Track timing
  const startTime = Date.now()

  // Phase 11: Enforce max tokens cap
  const maxTokens = Math.min(opts.maxTokens || 4096, AI_MAX_TOKENS)

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages,
    tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
    maxOutputTokens: maxTokens,
    temperature: opts.temperature,
    // Phase 11: Timeout protection
    abortSignal: createAITimeout().signal,
    onFinish: async ({ text, toolCalls, usage, toolResults }) => {
      const latencyMs = Date.now() - startTime
      // Phase 11: Record usage for rate tracking
      const totalTokens = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)
      recordAIUsage(context.organizationId, totalTokens)

      if (opts.conversationId) {
        await addMessage({
          conversationId: opts.conversationId,
          role: 'assistant',
          content: text,
          model: opts.model,
          provider: opts.provider,
          tokensIn: usage?.inputTokens ?? 0,
          tokensOut: usage?.outputTokens ?? 0,
          latencyMs,
          toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
          toolResults: toolResults && toolResults.length > 0 ? toolResults : undefined,
        })
      }
    },
  })

  return result
}

/** Send a message and create/get conversation */
export async function sendMessage(
  userMessage: string,
  context: ToolContext,
  opts: ChatOptions & { conversationId?: string; title?: string }
) {
  // Phase 11: Validate input early
  const inputCheck = validateAIInput(userMessage)
  if (!inputCheck.valid) {
    throw new Error(inputCheck.reason)
  }

  const { conversationId: existingId, ...rest } = opts
  let conversationId: string | undefined = existingId

  if (!conversationId) {
    const conv = await createConversation({
      organizationId: context.organizationId,
      userId: context.userId,
      title: opts.title || userMessage.slice(0, 100),
      agentSlug: opts.metadata?.agentSlug as string | undefined,
    })
    conversationId = conv.id
  }
  if (!conversationId) {
    throw new Error('Failed to resolve a conversation id')
  }
  const resolvedConversationId: string = conversationId

  await addMessage({
    conversationId: resolvedConversationId,
    role: 'user',
    content: userMessage,
  })

  const stream = await streamChat(
    { ...rest, conversationId: resolvedConversationId },
    context,
    userMessage
  )

  return { conversationId: resolvedConversationId, stream }
}
