// ══════════════════════════════════════════════════════
// MIANX.AI — Poultry Feed API
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import * as feedService from '@/domains/poultry/services/feed-service'
import { validateCreateFeedRecord, formatValidationErrors } from '@/domains/poultry/validation'

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
  const errors = validateCreateFeedRecord(body)
  if (errors.length > 0) {
    return NextResponse.json({ error: formatValidationErrors(errors) }, { status: 400 })
  }
  return feedService.createFeedRecord(ctx.organizationId, body)
}, { permission: 'poultry.feed.create' })
