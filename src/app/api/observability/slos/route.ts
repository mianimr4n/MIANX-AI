// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability: SLO Status API
// Returns all SLO targets with current availability and error budgets
// Phase 24: was completely unauthenticated (internal reliability data
// leaked to anyone). Now requires platform admin, same as /api/domains.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getSLOStatus } from '@/core/observability'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/platform-admin'

export const dynamic = 'force-dynamic'

async function requirePlatformAuth(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  if (!supabase && process.env.NODE_ENV !== 'production') {
    return
  }
  if (!supabase) {
    throw new Error('Authentication required')
  }
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    const e = new Error('Authentication required') as Error & { statusCode: number }
    e.statusCode = 401
    throw e
  }
  requirePlatformAdmin(user.email)
}

export async function GET(_request: NextRequest) {
  try {
    await requirePlatformAuth()
  } catch (e: unknown) {
    const status = (e as Error & { statusCode?: number }).statusCode || 500
    return NextResponse.json({ error: 'Authentication required' }, { status })
  }

  const status = getSLOStatus()
  return NextResponse.json({ slos: status })
}
