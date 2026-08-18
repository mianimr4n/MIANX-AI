import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization/middleware'
import { recordUsage, getUsageSnapshot, getAiBudgetStatus, listUsageRecords, ensureDefaultMeters, listMeters, checkUsageThresholds } from '@/core/billing/usage'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const meterKey = searchParams.get('meterKey')
  const ai = searchParams.get('ai') === 'true'
  const thresholds = searchParams.get('thresholds') === 'true'
  const records = searchParams.get('records') === 'true'
  const meters = searchParams.get('meters') === 'true'

  // Always use the authenticated org
  const organizationId = ctx.organizationId

  if (meters) {
    const data = await listMeters()
    return NextResponse.json({ data })
  }

  if (ai) {
    const data = await getAiBudgetStatus(organizationId)
    return NextResponse.json({ data })
  }

  if (thresholds) {
    const data = await checkUsageThresholds(organizationId)
    return NextResponse.json({ data })
  }

  if (records) {
    const data = await listUsageRecords(organizationId, { meterKey: meterKey ?? undefined, limit: 50 })
    return NextResponse.json({ data })
  }

  const data = await getUsageSnapshot(organizationId)
  return NextResponse.json({ data })
}, { permission: 'billing.usage.view' })

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const { action, ...params } = body

  switch (action) {
    case 'record':
      return NextResponse.json({ data: await recordUsage(params) }, { status: 201 })
    case 'ensure_meters':
      return NextResponse.json({ data: await ensureDefaultMeters() })
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}, { permission: 'billing.usage.view' })
