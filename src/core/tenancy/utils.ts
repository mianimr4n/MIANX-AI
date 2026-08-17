// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Shared Utilities
// ══════════════════════════════════════════════════════════════════

/** Convert a name to a URL-safe slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Generate a standard API response envelope */
export function apiEnvelope<T>(data: T, meta?: Record<string, unknown>) {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

/** Parse permission key 'domain.resource.action' into parts */
export function parsePermission(key: string): { domain: string; resource: string; action: string } | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null
  return { domain: parts[0], resource: parts[1], action: parts[2] }
}
