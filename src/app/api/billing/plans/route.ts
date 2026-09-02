import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import { listPlans, getSystemPlans, createPlan } from '@/core/billing/plans'
import { requirePlatformAdmin } from '@/lib/platform-admin'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const includeSystem = searchParams.get('system') === 'true'
  const status = searchParams.get('status') as 'draft' | 'active' | 'archived' | 'deprecated' | null

  if (includeSystem) {
    const plans = await getSystemPlans()
    // System plans are commercial catalog data, but never expose the
    // privileged isSystem flag or internal organization ownership.
    const safePlans = plans.map(({ isSystem: _isSystem, organizationId: _organizationId, ...plan }) => plan)
    return NextResponse.json({ data: safePlans })
  }

  const plans = await listPlans({
    status: status ?? undefined,
    includeSystem: false,
    organizationId: ctx.organizationId,
  })
  return NextResponse.json({
    data: plans.map(({ isSystem: _isSystem, ...plan }) => plan),
  })
}, { permission: 'billing.plans.view' })

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json()
  const requestedSystem = body?.isSystem === true

  if (requestedSystem) {
    requirePlatformAdmin(ctx.user.email)
  }

  const plan = await createPlan({
    ...body,
    // Only platform admins may create global system plans. All ordinary plan
    // creation is forcibly scoped to the authenticated organization.
    organizationId: requestedSystem ? undefined : ctx.organizationId,
    isSystem: requestedSystem,
  })

  return NextResponse.json({ data: plan }, { status: 201 })
}, { permission: 'billing.plans.manage' })
