// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Domain Modules API
// GET modules for a domain, POST register a new module
// Phase 22: All methods require platform admin auth.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { listModules, createModule } from '@/core/domain'
import { apiEnvelope } from '@/core/tenancy/utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/platform-admin'

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

function authError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/** GET /api/domains/:id/modules — List modules (platform admin) */
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
  const modules = await listModules(id)

  if (modules === null) {
    return NextResponse.json(apiEnvelope(null, 'Domain not found'), { status: 404 })
  }

  return NextResponse.json(apiEnvelope(modules))
}

/** POST /api/domains/:id/modules — Register module (platform admin) */
export async function POST(
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
    const { name, slug, version, description, manifest, status } = body

    if (!name || !version) {
      return NextResponse.json(
        apiEnvelope(null, 'name and version are required'),
        { status: 400 }
      )
    }

    const result = await createModule({
      domainId: id,
      name,
      slug,
      version,
      description,
      manifest: manifest ? JSON.stringify(manifest) : undefined,
      status,
    })

    if (!result.ok) {
      return NextResponse.json(apiEnvelope(null, result.error), {
        status: result.error.includes('not found') ? 404 : 409,
      })
    }

    return NextResponse.json(apiEnvelope(result.data), { status: 201 })
  } catch (error) {
    console.error('[POST /api/domains/:id/modules]', error)
    return NextResponse.json(apiEnvelope(null, 'Invalid request body'), { status: 400 })
  }
}
