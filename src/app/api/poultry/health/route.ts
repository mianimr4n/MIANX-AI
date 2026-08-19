// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Health API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as healthService from '@/domains/poultry/services/health-service'

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
  if (!body.flockId || !body.date || !body.type || !body.treatment) {
    return NextResponse.json({ error: 'flockId, date, type, and treatment are required' }, { status: 400 })
  }
  return healthService.createHealthRecord(ctx.organizationId, body)
}, { permission: 'poultry.health.create' })
