// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Sheds API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as shedService from '@/domains/poultry/services/shed-service'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  return shedService.listSheds(ctx.organizationId, {
    farmId: searchParams.get('farmId') || undefined,
    status: searchParams.get('status') || undefined,
  })
}, { permission: 'poultry.shed.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  if (!body.farmId || !body.name) {
    return NextResponse.json({ error: 'farmId and name are required' }, { status: 400 })
  }
  return shedService.createShed(ctx.organizationId, body)
}, { permission: 'poultry.shed.create' })
