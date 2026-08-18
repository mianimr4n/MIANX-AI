import { NextRequest, NextResponse } from 'next/server'
import { recordUsage, getUsageSnapshot, getAiBudgetStatus, listUsageRecords, ensureDefaultMeters, listMeters, checkUsageThresholds } from '@/core/billing/usage'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')!
    const meterKey = searchParams.get('meterKey')
    const ai = searchParams.get('ai') === 'true'
    const thresholds = searchParams.get('thresholds') === 'true'
    const records = searchParams.get('records') === 'true'
    const meters = searchParams.get('meters') === 'true'

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
