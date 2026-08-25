import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization/middleware'
import { db } from '@/lib/db'
import { createSubscription, listSubscriptions, getSubscriptionByOrg, upgradeSubscription, cancelSubscription, transitionSubscription, handlePaymentFailed, handlePaymentSucceeded, checkDowngradeSafety, downgradeSubscription } from '@/core/billing/subscriptions'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state') as any
  const listAll = searchParams.get('all') === 'true'

  // Admin can list all subscriptions; regular users only see their org
  if (listAll && ctx.permissions.includes('billing.metrics.admin')) {
    const subs = await listSubscriptions(state ? { state } : undefined)
    return NextResponse.json({ data: subs })
  }

  const sub = await getSubscriptionByOrg(ctx.organizationId)
  if (!sub) return NextResponse.json({ data: null })
  return NextResponse.json({ data: sub })
}, { permission: 'billing.subscriptions.view' })

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json()
  const { action, ...params } = body

  // Force organizationId from auth context, never from client
  const orgId = ctx.organizationId

  switch (action) {
    case 'create': {
      const result = await createSubscription(orgId, params.planVersionId, { ...params, organizationId: undefined })
      return NextResponse.json({ data: result }, { status: 201 })
    }
    case 'cancel': {
      // IDOR fix: verify subscription belongs to this org
      const sub = await db.subscription.findFirst({ where: { id: params.subscriptionId, organizationId: orgId } })
      if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      return NextResponse.json({ data: await cancelSubscription(params.subscriptionId, params.immediate) })
    }
    case 'upgrade': {
      const sub = await db.subscription.findFirst({ where: { id: params.subscriptionId, organizationId: orgId } })
      if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      return NextResponse.json({ data: await upgradeSubscription(params.subscriptionId, params.planVersionId) })
    }
    case 'downgrade': {
      const sub = await db.subscription.findFirst({ where: { id: params.subscriptionId, organizationId: orgId } })
      if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      const check = await checkDowngradeSafety(params.subscriptionId, params.planVersionId)
      if (!check.canDowngrade) return NextResponse.json({ error: 'Cannot downgrade', conflicts: check.conflicts }, { status: 400 })
      return NextResponse.json({ data: await downgradeSubscription(params.subscriptionId, params.planVersionId) })
    }
    case 'transition': {
      const sub = await db.subscription.findFirst({ where: { id: params.subscriptionId, organizationId: orgId } })
      if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      return NextResponse.json({ data: await transitionSubscription(params.subscriptionId, params.newState, params.metadata) })
    }
    case 'payment_failed': {
      const sub = await db.subscription.findFirst({ where: { id: params.subscriptionId, organizationId: orgId } })
      if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      return NextResponse.json({ data: await handlePaymentFailed(params.subscriptionId) })
    }
    case 'payment_succeeded': {
      const sub = await db.subscription.findFirst({ where: { id: params.subscriptionId, organizationId: orgId } })
      if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      return NextResponse.json({ data: await handlePaymentSucceeded(params.subscriptionId) })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}, { permission: 'billing.subscriptions.manage' })
