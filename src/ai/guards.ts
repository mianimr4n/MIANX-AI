// ══════════════════════════════════════════════════════════════════
// MIANX.AI — AI Safety Guards
// Phase 11: Cost protection, timeout, recursion prevention
// ══════════════════════════════════════════════════════════════════

/** Maximum tokens for a single AI response */
export const AI_MAX_TOKENS = 16384

/** Maximum total tool calls per conversation turn */
export const AI_MAX_TOOL_CALLS = 10

/** AI request timeout in milliseconds */
export const AI_TIMEOUT_MS = 60000

/** Maximum input message length (characters) */
export const AI_MAX_INPUT_LENGTH = 32000

/** Maximum conversation history messages to send */
export const AI_MAX_HISTORY_MESSAGES = 50

/** Cost tracking per organization (in-memory, per-process) */
const orgCostTracking = new Map<string, { tokensUsed: number; requestsToday: number; resetDate: string }>()

/** Daily token limit per organization */
const DAILY_TOKEN_LIMIT = parseInt(process.env.AI_DAILY_TOKEN_LIMIT || '100000', 10)

/** Daily request limit per organization */
const DAILY_REQUEST_LIMIT = parseInt(process.env.AI_DAILY_REQUEST_LIMIT || '500', 10)

/**
 * Check if an organization has exceeded its daily AI limits.
 * Returns { allowed: boolean, reason?: string }
 */
export function checkAILimits(organizationId: string, estimatedTokens: number): { allowed: boolean; reason?: string } {
  const today = new Date().toISOString().split('T')[0]
  let tracking = orgCostTracking.get(organizationId)

  // Reset if new day
  if (!tracking || tracking.resetDate !== today) {
    tracking = { tokensUsed: 0, requestsToday: 0, resetDate: today }
    orgCostTracking.set(organizationId, tracking)
  }

  if (tracking.requestsToday >= DAILY_REQUEST_LIMIT) {
    return { allowed: false, reason: `Daily AI request limit (${DAILY_REQUEST_LIMIT}) exceeded` }
  }

  if (tracking.tokensUsed + estimatedTokens > DAILY_TOKEN_LIMIT) {
    return { allowed: false, reason: `Daily AI token limit (${DAILY_TOKEN_LIMIT}) would be exceeded` }
  }

  return { allowed: true }
}

/** Record AI usage after a request completes */
export function recordAIUsage(organizationId: string, tokensUsed: number) {
  const today = new Date().toISOString().split('T')[0]
  let tracking = orgCostTracking.get(organizationId)
  if (!tracking || tracking.resetDate !== today) {
    tracking = { tokensUsed: 0, requestsToday: 0, resetDate: today }
    orgCostTracking.set(organizationId, tracking)
  }
  tracking.tokensUsed += tokensUsed
  tracking.requestsToday++
}

/** Validate input before sending to AI */
export function validateAIInput(message: string): { valid: boolean; reason?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, reason: 'Message cannot be empty' }
  }
  if (message.length > AI_MAX_INPUT_LENGTH) {
    return { valid: false, reason: `Message too long (${message.length} chars, max ${AI_MAX_INPUT_LENGTH})` }
  }
  return { valid: true }
}

/** Create an AbortController with AI timeout */
export function createAITimeout(): AbortController {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  return controller
}
