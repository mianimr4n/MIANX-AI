import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { listPlans, getSystemPlans, createPlan } from '@/core/billing/plans'
import { ensureDefaultMeters } from '@/core/billing/usage'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const includeSystem = searchParams.get('system') === 'true'
    const status = searchParams.get('status') as 'draft' | 'active' | 'archived' | 'deprecated' | null

    if (includeSystem) {
      const plans = await getSystemPlans()
      return NextResponse.json({ data: plans })
    }

    const plans = await listPlans({ status: status ?? undefined, includeSystem })
    return NextResponse.json({ data: plans })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const plan = await createPlan(body)
    return NextResponse.json({ data: plan }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}