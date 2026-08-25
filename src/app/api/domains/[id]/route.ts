// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Single Domain API
// GET detail, PATCH update, DELETE deprecate
// Phase 22: All methods require platform admin auth.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getDomain, updateDomain, deprecateDomain } from '@/core/domain'
import { apiEnvelope } from '@/core/tenancy/utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import type { DomainManifest } from '@/core/domain'

/** Resolve user and verify platform admin */
async function requirePlatformAuth(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  if (!supabase && process.env.NODE_ENV !== 'production') {
    // Dev mode: allow if no Supabase (platform admin check not possible)
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

function authError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/** GET /api/domains/:id — Get domain detail with modules (platform admin) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAuth()
  } catch (e: unknown) {
    const status = (e as Error & { statusCode?: number }).statusCode || 500
    return authError('Authentication required', status)
  }

  const { id } = await params
  const domain = await getDomain(id, { includeModules: true })

  if (!domain) {
    return NextResponse.json(apiEnvelope(null, 'Domain not found'), { status: 404 })
  }

  return NextResponse.json(apiEnvelope(domain))
}

/** PATCH /api/domains/:id — Update domain (platform admin) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAuth()
  } catch (e: unknown) {
    const status = (e as Error & { statusCode?: number }).statusCode || 500
    return authError('Authentication required', status)
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, description, version, status, manifest } = body

    const result = await updateDomain(id, {
      name, description, version, status,
      manifest: manifest as DomainManifest | undefined,
    })

    if (!result.ok) {
      return NextResponse.json(apiEnvelope(null, result.error), { status: result.error.includes('not found') ? 404 : 400 })
    }

    return NextResponse.json(apiEnvelope(result.data))
  } catch (error) {
    console.error('[PATCH /api/domains/:id]', error)
    return NextResponse.json(apiEnvelope(null, 'Invalid request body'), { status: 400 })
  }
}

/** DELETE /api/domains/:id — Deprecate domain (platform admin) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAuth()
  } catch (e: unknown) {
    const status = (e as Error & { statusCode?: number }).statusCode || 500
    return authError('Authentication required', status)
  }

  const { id } = await params
  const result = await deprecateDomain(id)

  if (!result.ok) {
    return NextResponse.json(apiEnvelope(null, result.error), { status: result.error.includes('not found') ? 404 : 409 })
  }

  return NextResponse.json(apiEnvelope(result.data, 'Domain deprecated'))
}
