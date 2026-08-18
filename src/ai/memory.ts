// ══════════════════════════════════════════════════════
// MIANX.AI — Conversation Memory
// Persist and retrieve conversation history for multi-turn chat
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import type { ChatMessage } from './types'

/** Create a new conversation */
export async function createConversation(data: {
  organizationId: string
  userId: string
  title?: string
  agentSlug?: string
  metadata?: Record<string, unknown>
}) {
  return db.conversation.create({
    data: {
      organizationId: data.organizationId,
      userId: data.userId,
      title: data.title,
      agentSlug: data.agentSlug,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  })
}

/** Add a message to a conversation */
export async function addMessage(data: {
  conversationId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  model?: string
  provider?: string
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
  toolCalls?: unknown
  toolResults?: unknown
}) {
  return db.aiMessage.create({
    data: {
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      model: data.model,
      provider: data.provider,
      tokensIn: data.tokensIn ?? 0,
      tokensOut: data.tokensOut ?? 0,
      latencyMs: data.latencyMs ?? 0,
      toolCalls: data.toolCalls ? JSON.stringify(data.toolCalls) : null,
      toolResults: data.toolResults ? JSON.stringify(data.toolResults) : null,
    },
  })
}

/** Get conversation messages as ChatMessage[] for the AI SDK */
export async function getConversationMessages(
  conversationId: string,
  opts?: { limit?: number }
): Promise<ChatMessage[]> {
  const messages = await db.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: opts?.limit,
  })

  return messages.map(m => {
    const msg: ChatMessage = { role: m.role as ChatMessage['role'], content: m.content }
    if (m.toolCalls) {
      try { msg.toolCalls = JSON.parse(m.toolCalls) } catch { /* ignore */ }
    }
    return msg
  })
}

/** List conversations for a user in an org */
export async function listConversations(organizationId: string, userId: string) {
  return db.conversation.findMany({
    where: { organizationId, userId, status: 'active' },
    include: {
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })
}

/** Get a single conversation with messages */
export async function getConversation(conversationId: string, organizationId: string) {
  return db.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      _count: { select: { messages: true } },
    },
  })
}

/** Update conversation title */
export async function updateConversationTitle(conversationId: string, organizationId: string, title: string) {
  return db.conversation.update({
    where: { id: conversationId, organizationId },
    data: { title },
  })
}

/** Archive a conversation */
export async function archiveConversation(conversationId: string, organizationId: string) {
  return db.conversation.update({
    where: { id: conversationId, organizationId },
    data: { status: 'archived' },
  })
}

/** Get AI usage stats for an organization */
export async function getUsageStats(organizationId: string) {
  const conversations = await db.conversation.count({ where: { organizationId } })
  const messages = await db.aiMessage.findMany({
    where: { conversation: { organizationId } },
    select: { tokensIn: true, tokensOut: true, provider: true, model: true, latencyMs: true },
  })

  let totalIn = 0, totalOut = 0, totalLatency = 0
  const byProvider: Record<string, { messages: number; tokensIn: number; tokensOut: number }> = {}
  const byModel: Record<string, { messages: number; tokensIn: number; tokensOut: number }> = {}

  for (const m of messages) {
    totalIn += m.tokensIn
    totalOut += m.tokensOut
    totalLatency += m.latencyMs

    const p = m.provider ?? 'unknown'
    if (!byProvider[p]) byProvider[p] = { messages: 0, tokensIn: 0, tokensOut: 0 }
    byProvider[p].messages++
    byProvider[p].tokensIn += m.tokensIn
    byProvider[p].tokensOut += m.tokensOut

    const mdl = m.model ?? 'unknown'
    if (!byModel[mdl]) byModel[mdl] = { messages: 0, tokensIn: 0, tokensOut: 0 }
    byModel[mdl].messages++
    byModel[mdl].tokensIn += m.tokensIn
    byModel[mdl].tokensOut += m.tokensOut
  }

  return {
    totalConversations: conversations,
    totalMessages: messages.length,
    totalTokensIn: totalIn,
    totalTokensOut: totalOut,
    avgLatencyMs: messages.length > 0 ? Math.round(totalLatency / messages.length) : 0,
    byProvider,
    byModel,
  }
}
