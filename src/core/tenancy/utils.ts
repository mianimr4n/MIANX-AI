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

/** Generate a standard API response as NextResponse */
import { NextResponse } from 'next/server'

export function apiEnvelope<T>(data: T, meta?: string | Record<string, unknown>, status?: number) {
  const body = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(typeof meta === 'string' ? { message: meta } : meta ?? {}),
    },
  }
  // Error envelope: data is null/undefined with a string message
  if (typeof meta === 'string' && meta.length > 0 && data == null) {
    return NextResponse.json(body, { status: status || 404 })
  }
  return NextResponse.json(body, status ? { status } : undefined)
}

/** Parse permission key into parts.
 * Supports both formats:
 *   3-part: 'domain.resource.action' (e.g., 'poultry.flock.view')
 *   2-part: 'resource.action' (e.g., 'team.view') — domain defaults to '*'
 */
export function parsePermission(key: string): { domain: string; resource: string; action: string } | null {
  const parts = key.split('.')
  if (parts.length === 3) {
    return { domain: parts[0], resource: parts[1], action: parts[2] }
  }
  if (parts.length === 2) {
    return { domain: '*', resource: parts[0], action: parts[1] }
  }
  return null
}
