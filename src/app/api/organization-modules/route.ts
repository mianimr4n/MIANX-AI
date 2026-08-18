// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Organization Modules API
// Tenant-scoped: activate/deactivate modules for an org
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { activateModule, getOrganizationModules } from '@/core/domain'
import { withAuth } from '@/core/authorization'
import { apiEnvelope } from '@/core/tenancy/utils'

/** GET /api/organization-modules — List org's active modules (tenant-scoped) */
export const GET = withAuth(async (request, ctx) => {
  const modules = await getOrganizationModules(ctx.organizationId)
  return NextResponse.json(apiEnvelope(modules))
}, { permission: 'domain.view' })

/** POST /api/organization-modules — Activate a module for this org */
export const POST = withAuth(async (request, ctx) => {
  try {
    const body = await request.json()
    const { moduleId, configuration } = body

    if (!moduleId) {
      return NextResponse.json(apiEnvelope(null, 'moduleId is required'), { status: 400 })
    }

    const result = await activateModule({
      organizationId: ctx.organizationId,
      moduleId,
      configuration,
    })

    if (!result.ok) {
      return NextResponse.json(apiEnvelope(null, result.error), { status: 409 })
    }

    return NextResponse.json(apiEnvelope(result.data), { status: 201 })
  } catch (error) {
    console.error('[POST /api/organization-modules]', error)
    return NextResponse.json(apiEnvelope(null, 'Invalid request body'), { status: 400 })
  }
}, { permission: 'domain.activate' })
