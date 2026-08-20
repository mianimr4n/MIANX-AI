// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Health API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as healthService from '@/domains/poultry/services/health-service'
import { validateCreateHealthRecord, formatValidationErrors } from '@/domains/poultry/validation'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view === 'mortality') {
    return healthService.getMortalityRecords(ctx.organizationId, {
      flockId: searchParams.get('flockId') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    })
  }

  if (view === 'summary') {
    return healthService.getHealthSummary(ctx.organizationId, {
      flockId: searchParams.get('flockId') || undefined,
    })
  }

  return healthService.listHealthRecords(ctx.organizationId, {
    flockId: searchParams.get('flockId') || undefined,
    type: searchParams.get('type') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })
}, { permission: 'poultry.health.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  const errors = validateCreateHealthRecord(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return healthService.createHealthRecord(ctx.organizationId, body)
}, { permission: 'poultry.health.create' })
