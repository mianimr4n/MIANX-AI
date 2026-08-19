// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Farms API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as farmService from '@/domains/poultry/services/farm-service'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  return farmService.listFarms(ctx.organizationId, {
    status: searchParams.get('status') || undefined,
  })
}, { permission: 'poultry.farm.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  if (!body.name || !body.location) {
    return NextResponse.json({ error: 'name and location are required' }, { status: 400 })
  }
  return farmService.createFarm(ctx.organizationId, body)
}, { permission: 'poultry.farm.create' })
