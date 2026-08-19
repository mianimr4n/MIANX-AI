// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Feed API
// ══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as feedService from '@/domains/poultry/services/feed-service'

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view')

  if (view === 'summary') {
    return feedService.getFeedSummary(ctx.organizationId, {
      flockId: searchParams.get('flockId') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    })
  }

  return feedService.listFeedRecords(ctx.organizationId, {
    flockId: searchParams.get('flockId') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })
}, { permission: 'poultry.feed.view' })

export const POST = withAuth(async (request, ctx) => {
  const body = await request.json()
  if (!body.flockId || !body.date || !body.feedType || !body.quantityKg) {
    return NextResponse.json({ error: 'flockId, date, feedType, and quantityKg are required' }, { status: 400 })
  }
  return feedService.createFeedRecord(ctx.organizationId, body)
}, { permission: 'poultry.feed.create' })
