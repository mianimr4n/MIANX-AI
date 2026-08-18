// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Single Domain API
// GET detail, PATCH update, DELETE deprecate
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getDomain, updateDomain, deprecateDomain } from '@/core/domain'
import { apiEnvelope } from '@/core/tenancy/utils'
import type { DomainManifest } from '@/core/domain'

/** GET /api/domains/:id — Get domain detail with modules */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const domain = await getDomain(id, { includeModules: true })

  if (!domain) {
    return NextResponse.json(apiEnvelope(null, 'Domain not found'), { status: 404 })
  }

  return NextResponse.json(apiEnvelope(domain))
}

/** PATCH /api/domains/:id — Update domain */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

/** DELETE /api/domains/:id — Deprecate domain (soft delete) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await deprecateDomain(id)

  if (!result.ok) {
    return NextResponse.json(apiEnvelope(null, result.error), { status: result.error.includes('not found') ? 404 : 409 })
  }

  return NextResponse.json(apiEnvelope(result.data, 'Domain deprecated'))
}