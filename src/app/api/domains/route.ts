// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Global Domains API
// Platform-level: domains are NOT tenant-scoped (they're global manifests)
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createDomain, listDomains } from '@/core/domain'
import { apiEnvelope } from '@/core/tenancy/utils'
import type { DomainManifest } from '@/core/domain'

/** GET /api/domains — List all global domains */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const includeModules = searchParams.get('include') === 'modules'

    const domains = await listDomains({ status, includeModules })

    return NextResponse.json(apiEnvelope(domains))
  } catch (error) {
    console.error('[GET /api/domains]', error)
    return NextResponse.json(
      apiEnvelope(null, 'Failed to fetch domains'),
      { status: 500 }
    )
  }
}

/** POST /api/domains — Create a new global domain */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, version, description, manifest, status } = body

    if (!name || !version) {
      return NextResponse.json(
        apiEnvelope(null, 'name and version are required'),
        { status: 400 }
      )
    }

    const result = await createDomain({
      name,
      slug,
      version,
      description,
      manifest: manifest as DomainManifest | undefined,
      status,
    })

    if (!result.ok) {
      return NextResponse.json(apiEnvelope(null, result.error), { status: 409 })
    }

    return NextResponse.json(apiEnvelope(result.data), { status: 201 })
  } catch (error) {
    console.error('[POST /api/domains]', error)
    return NextResponse.json(apiEnvelope(null, 'Invalid request body'), { status: 400 })
  }
}
