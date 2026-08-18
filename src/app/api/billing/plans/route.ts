import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import { listPlans, getSystemPlans, createPlan } from '@/core/billing/plans'
import { ensureDefaultMeters } from '@/core/billing/usage'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const includeSystem = searchParams.get('system') === 'true'
  const status = searchParams.get('status') as 'draft' | 'active' | 'archived' | 'deprecated' | null

  if (includeSystem) {
    const plans = await getSystemPlans()
    return NextResponse.json({ data: plans })
  }

  const plans = await listPlans({ status: status ?? undefined, includeSystem })
  return NextResponse.json({ data: plans })
}, { permission: 'billing.plans.view' })

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const plan = await createPlan(body)
  return NextResponse.json({ data: plan }, { status: 201 })
}, { permission: 'billing.plans.manage' })
