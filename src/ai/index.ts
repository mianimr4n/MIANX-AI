// ══════════════════════════════════════════════════════
// MIANX.AI — AI Core Module
// Barrel exports for the AI engine
// ══════════════════════════════════════════════════════

export type {
  AIProvider,
  ModelId,
  ModelCapabilities,
  RegisteredModel,
  ChatMessage,
  ToolCall,
  ToolDefinition,
  ToolContext,
  ChatOptions,
  ChatResult,
  AgentDefinition,
  AIUsageStats,
} from './types'

export {
  listModels,
  getModel,
  getDefaultModel,
  parseModelId,
  getLanguageModel,
  isProviderConfigured,
  getConfiguredProviders,
} from './router'

export {
  listTools,
  getTool,
  getToolsByNames,
  toAISDKTools,
} from './tools'

export {
  SYSTEM_AGENTS,
  getSystemAgent,
  listSystemAgents,
  isSystemAgent,
} from './agents'

export {
  createConversation,
  addMessage,
  getConversationMessages,
  listConversations,
  getConversation,
  updateConversationTitle,
  archiveConversation,
  getUsageStats,
} from './memory'

export {
  streamChat,
  sendMessage,
} from './chat'
