import { NextRequest, NextResponse } from 'next/server'
import { createSubscription, listSubscriptions, getSubscriptionByOrg, upgradeSubscription, cancelSubscription, transitionSubscription, handlePaymentFailed, handlePaymentSucceeded, checkDowngradeSafety, downgradeSubscription } from '@/core/billing/subscriptions'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const state = searchParams.get('state') as any

    if (organizationId) {
      const sub = await getSubscriptionByOrg(organizationId)
      if (!sub) return NextResponse.json({ data: null })
      return NextResponse.json({ data: sub })
    }

    const subs = await listSubscriptions(state ? { state } : undefined)
    return NextResponse.json({ data: subs })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...params } = body

    switch (action) {
      case 'create':
        return NextResponse.json({ data: await createSubscription(params.organizationId, params.planVersionId, params) }, { status: 201 })
      case 'cancel':
        return NextResponse.json({ data: await cancelSubscription(params.subscriptionId, params.immediate) })
      case 'upgrade':
        return NextResponse.json({ data: await upgradeSubscription(params.subscriptionId, params.planVersionId) })
      case 'downgrade': {
        const check = await checkDowngradeSafety(params.subscriptionId, params.planVersionId)
        if (!check.canDowngrade) return NextResponse.json({ error: 'Cannot downgrade', conflicts: check.conflicts }, { status: 400 })
        return NextResponse.json({ data: await downgradeSubscription(params.subscriptionId, params.planVersionId) })
      }
      case 'transition':
        return NextResponse.json({ data: await transitionSubscription(params.subscriptionId, params.newState, params.metadata) })
      case 'payment_failed':
        return NextResponse.json({ data: await handlePaymentFailed(params.subscriptionId) })
      case 'payment_succeeded':
        return NextResponse.json({ data: await handlePaymentSucceeded(params.subscriptionId) })
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}