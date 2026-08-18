// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organization Domains API
// Tenant-scoped: activate/deactivate domains for an org
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { activateDomain, getOrganizationDomains } from '@/core/domain'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/organization-domains — List org's domains (tenant-scoped) */
export const GET = withAuth(async (request, ctx) => {
  const domains = await getOrganizationDomains(ctx.organizationId)
  return NextResponse.json(apiEnvelope(domains))
}, { permission: 'domain.view' })

/** POST /api/organization-domains — Activate a domain for this org */
export const POST = withAuth(async (request, ctx) => {
  try {
    const body = await request.json()
    const { domainId, configuration } = body

    if (!domainId) {
      return NextResponse.json(apiEnvelope(null, 'domainId is required'), { status: 400 })
    }

    const result = await activateDomain({
      organizationId: ctx.organizationId,
      domainId,
      configuration,
    })

    if (!result.ok) {
      return NextResponse.json(apiEnvelope(null, result.error), { status: 409 })
    }

    return NextResponse.json(apiEnvelope(result.data), { status: 201 })
  } catch (error) {
    console.error('[POST /api/organization-domains]', error)
    return NextResponse.json(apiEnvelope(null, 'Invalid request body'), { status: 400 })
  }
}, { permission: 'domain.activate' })
