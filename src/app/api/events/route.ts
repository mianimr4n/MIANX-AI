// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Events API
// GET    /api/events           — List events for organization
// POST   /api/events           — Publish a new event
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { publishEvent, listEvents, type EventFilters } from '@/core/automation'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

const VALID_EVENT_STATUSES = ['pending', 'delivered', 'failed', 'dead_lettered'] as const

type EventStatusFilter = (typeof VALID_EVENT_STATUSES)[number]

// GET /api/events — List events for organization
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const { searchParams } = request.nextUrl

  const eventType = searchParams.get('eventType') || undefined
  const rawStatus = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '20', 10) || 20))

  const filters: EventFilters = {}

  if (eventType) {
    filters.eventType = eventType
  }

  if (rawStatus) {
    if (!VALID_EVENT_STATUSES.includes(rawStatus as EventStatusFilter)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_EVENT_STATUSES.join(', ')}` },
        { status: 400 },
      )
    }
    filters.status = rawStatus as EventStatusFilter
  }

  const result = await listEvents(ctx.organizationId, filters, page, pageSize)

  return NextResponse.json(
    apiEnvelope(result.data, {
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    }),
  )
}, { anyPermission: ['automation.events.view', 'automation.events.manage'] })

// POST /api/events — Publish a new event
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { eventType, payload, domainId, correlationId, sourceType, sourceId } = body

  if (!eventType || typeof eventType !== 'string' || eventType.trim().length === 0) {
    return NextResponse.json(
      { error: 'eventType is required and must be a non-empty string' },
      { status: 400 },
    )
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json(
      { error: 'payload is required and must be a non-null object' },
      { status: 400 },
    )
  }

  if (domainId !== undefined && typeof domainId !== 'string') {
    return NextResponse.json(
      { error: 'domainId must be a string if provided' },
      { status: 400 },
    )
  }

  if (correlationId !== undefined && typeof correlationId !== 'string') {
    return NextResponse.json(
      { error: 'correlationId must be a string if provided' },
      { status: 400 },
    )
  }

  if (sourceType !== undefined && typeof sourceType !== 'string') {
    return NextResponse.json(
      { error: 'sourceType must be a string if provided' },
      { status: 400 },
    )
  }

  if (sourceId !== undefined && typeof sourceId !== 'string') {
    return NextResponse.json(
      { error: 'sourceId must be a string if provided' },
      { status: 400 },
    )
  }

  const event = await publishEvent({
    eventType: eventType.trim(),
    payload,
    organizationId: ctx.organizationId,
    actorType: 'user',
    actorId: ctx.user.id,
    domainId: domainId || undefined,
    correlationId: correlationId || undefined,
    sourceType: sourceType || 'api',
    sourceId: sourceId || undefined,
  })

  return NextResponse.json(apiEnvelope(event), { status: 201 })
}, { permission: 'automation.events.manage' })
