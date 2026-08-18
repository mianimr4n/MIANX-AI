// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Domain Modules API
// GET modules for a domain, POST register a new module
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { listModules, createModule } from '@/core/domain'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/domains/:id/modules — List modules for a domain */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const modules = await listModules(id)

  if (modules === null) {
    return NextResponse.json(apiEnvelope(null, 'Domain not found'), { status: 404 })
  }

  return NextResponse.json(apiEnvelope(modules))
}

/** POST /api/domains/:id/modules — Register a module under a domain */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
