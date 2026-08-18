// ══════════════════════════════════════════════════════
// MIANX.AI — Chat Engine
// Orchestrates AI completions with tools, memory, and agent config
// ══════════════════════════════════════════════════════════════════

import { streamText, type CoreMessage } from 'ai'
import type { AIProvider, ChatOptions, ChatResult, ToolContext } from './types'
import { getLanguageModel, parseModelId, getDefaultModel, isProviderConfigured } from './router'
import { getToolsByNames, toAISDKTools, listTools } from './tools'
import { createConversation, addMessage, getConversationMessages } from './memory'
import { getSystemAgent } from './agents'

/** Resolve the model to use: explicit > agent config > org setting > default */
function resolveModel(opts: ChatOptions): { provider: AIProvider; model: string } {
  if (opts.provider && opts.model) return { provider: opts.provider, model: opts.model }
  if (opts.model) {
    const parsed = parseModelId(opts.model)
    if (parsed) return parsed
  }
  // Fall back to default
  const def = getDefaultModel()
  return { provider: def.provider, model: def.id }
}

/** Resolve system prompt: explicit > agent > generic */
function resolveSystemPrompt(opts: ChatOptions): string {
  if (opts.systemPrompt) return opts.systemPrompt
  if (opts.metadata?.agentSlug) {
    const agent = getSystemAgent(opts.metadata.agentSlug as string)
    if (agent) return agent.systemPrompt
  }
  return 'You are a helpful assistant for Mianx.ai, an AI-Native Business Operating System. Help the user with their organization data and configuration.'
}

/** Resolve tools: explicit agent config > all available */
function resolveTools(opts: ChatOptions, context: ToolContext) {
  let toolNames: string[] | undefined
  if (opts.metadata?.agentSlug) {
    const agent = getSystemAgent(opts.metadata.agentSlug as string)
    toolNames = agent?.tools
  }
  const tools = toolNames ? getToolsByNames(toolNames) : listTools()
  return toAISDKTools(tools, context)
}

/** Create a streaming chat response using Vercel AI SDK */
export async function streamChat(opts: ChatOptions, context: ToolContext) {
  const { provider, model } = resolveModel(opts)

  // Check if provider is configured
  if (!isProviderConfigured(provider)) {
    const configured = (['openai', 'anthropic', 'google'] as AIProvider[])
      .filter(isProviderConfigured)
      .map(p => p)
    if (configured.length > 0) {
      // Fallback to first configured provider
      const fallback = getDefaultModel()
      return executeStream({ ...opts, provider: fallback.provider, model: fallback.id }, context)
    }
    throw new Error(`No AI providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY in .env`)
  }

  return executeStream({ ...opts, provider, model }, context)
}

async function executeStream(opts: ChatOptions & { provider: AIProvider; model: string }, context: ToolContext) {
  const systemPrompt = resolveSystemPrompt(opts)
  const aiTools = resolveTools(opts, context)
  const languageModel = getLanguageModel(opts.provider, opts.model)

  // Build messages from conversation history or direct input
  let messages: CoreMessage[] = []
  if (opts.conversationId) {
    const history = await getConversationMessages(opts.conversationId)
    messages = history.map(m => ({ role: m.role, content: m.content })) as CoreMessage[]
  }

  // Track timing
  const startTime = Date.now()

  const result = streamText({
    model: languageModel,
    system: systemPrompt,
    messages,
    tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    onFinish: async ({ text, toolCalls, usage, toolResults }) => {
      const latencyMs = Date.now() - startTime
      // Persist assistant message
      if (opts.conversationId) {
        await addMessage({
          conversationId: opts.conversationId,
          role: 'assistant',
          content: text,
          model: opts.model,
          provider: opts.provider,
          tokensIn: usage?.promptTokens ?? 0,
          tokensOut: usage?.completionTokens ?? 0,
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
  const { conversationId: existingId, ...rest } = opts
  let conversationId = existingId

  // Create conversation if new
  if (!conversationId) {
    const conv = await createConversation({
      organizationId: context.organizationId,
      userId: context.userId,
      title: opts.title || userMessage.slice(0, 100),
      agentSlug: opts.metadata?.agentSlug as string | undefined,
    })
    conversationId = conv.id
  }

  // Persist user message
  await addMessage({
    conversationId,
    role: 'user',
    content: userMessage,
  })

  // Stream the response
  const stream = await streamChat(
    { ...rest, conversationId },
    context
  )

  return { conversationId, stream }
}
