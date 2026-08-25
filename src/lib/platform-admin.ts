// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Platform Admin Authorization
// Platform admins are identified by email allowlist from env.
// ══════════════════════════════════════════════════════════════════

import { AuthorizationError } from '@/core/authorization/auth-context'

/** Comma-separated list of platform admin emails */
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * Check if an email belongs to a platform admin.
 * Returns false for null/undefined emails.
 */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Require platform admin — throws AuthorizationError(403) if not.
 */
export function requirePlatformAdmin(email: string | null | undefined): void {
  if (!isPlatformAdmin(email)) {
    throw new AuthorizationError('Platform admin access required', 403)
  }
}
