// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Telemetry Data Redaction
// Ensures no sensitive data leaks into logs, metrics, or traces
// ══════════════════════════════════════════════════════════════════

/** Field names that must be redacted from telemetry */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'apikeysecret',
  'api_key_secret',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'privatekey',
  'private_key',
  'creditcard',
  'credit_card',
  'cvv',
  'ssn',
  'socialsecurity',
  'bankaccount',
  'bank_account',
  'authorization',
  'cookie',
  'setcookie',
  'xapikeys',
  'servicekey',
  'service_key',
  'webhooksecret',
  'webhook_secret',
  'paymentsecret',
  'payment_secret',
  'bearer',
])

const REDACTED_VALUE = '[REDACTED]'

/** Patterns that detect sensitive values in strings */
const SENSITIVE_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /sk-[A-Za-z0-9]{20,}/g,             // OpenAI-style keys
  /ghp_[A-Za-z0-9]{36}/g,               // GitHub PATs
  /xox[bpas]-[A-Za-z0-9-]+/g,           // Slack tokens
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
  /\b\d{3}-\d{2}-\d{4}\b/g,             // SSN
]

/**
 * Redact sensitive fields from a flat object.
 * Returns a new object with sensitive values replaced by [REDACTED].
 */
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      result[key] = REDACTED_VALUE
    } else if (typeof value === 'string') {
      result[key] = redactString(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? redactObject(item as Record<string, unknown>)
          : typeof item === 'string'
            ? redactString(item)
            : item
      )
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Redact sensitive patterns from a string value.
 */
export function redactString(value: string): string {
  let result = value
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, REDACTED_VALUE)
  }
  return result
}

/**
 * Redact headers for telemetry output.
 */
export function redactHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const REDACTED_HEADERS = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'proxy-authorization',
    'www-authenticate',
  ])

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (REDACTED_HEADERS.has(key.toLowerCase())) {
      result[key] = REDACTED_VALUE
    } else {
      result[key] = Array.isArray(value) ? value.join(', ') : value || ''
    }
  }
  return result
}

/**
 * Check if a field name is sensitive.
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELDS.has(fieldName.toLowerCase().replace(/[^a-z0-9]/g, ''))
}
