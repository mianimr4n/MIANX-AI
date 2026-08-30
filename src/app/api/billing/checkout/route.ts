// MIANX.AI — Stripe Checkout Session
// Creates a Stripe Checkout Session for plan upgrade/purchase.

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization/middleware'
import { db } from '@/lib/db'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function getOrCreateStripeCustomer(
  email: string,
  organizationId: string,
  orgName: string,
): Promise<string | null> {
  if (!STRIPE_SECRET_KEY) return null

  const subscription = await db.subscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  })
  if (subscription?.stripeCustomerId) return subscription.stripeCustomerId

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const customer = await stripe.customers.create({
      email,
      metadata: { organizationId, orgName },
    })

    if (subscription) {
      await db.subscription.update({
        where: { organizationId },
        data: { stripeCustomerId: customer.id },
      })
    }

    return customer.id
  } catch {
    return null
  }
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => null)
  const planSlug = body?.planSlug
  const billingCycle = body?.billingCycle === 'yearly' ? 'yearly' : 'monthly'

  if (typeof planSlug !== 'string' || !planSlug.trim()) {
    return NextResponse.json({ error: 'planSlug is required' }, { status: 400 })
  }

  const plan = await db.plan.findFirst({
    where: { slug: planSlug, status: 'active', isSystem: true },
    include: {
      versions: {
        where: { status: 'active' },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  if (!plan || !plan.versions[0]) {
    return NextResponse.json({ error: `Plan '${planSlug}' not found or has no active version` }, { status: 404 })
  }

  const planVersion = plan.versions[0]
  if (Number(plan.basePrice) === 0) {
    return NextResponse.json(
      { error: 'Free plan does not require checkout. Use the subscription API directly.' },
      { status: 400 },
    )
  }

  const org = await db.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true },
  })
  const customerId = await getOrCreateStripeCustomer(
    ctx.user.email || '',
    ctx.organizationId,
    org?.name || 'Unknown',
  )

  if (!customerId) {
    return NextResponse.json({ error: 'Failed to create or retrieve Stripe customer' }, { status: 500 })
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    let planMetadata: Record<string, unknown> = {}
    try {
      planMetadata = plan.metadata ? JSON.parse(plan.metadata) : {}
    } catch {
      return NextResponse.json({ error: 'Plan billing metadata is invalid' }, { status: 500 })
    }

    const priceId = planMetadata[`stripe_price_id_${billingCycle}`]
    if (typeof priceId !== 'string' || !priceId.startsWith('price_')) {
      return NextResponse.json(
        { error: `No valid Stripe Price ID configured for plan '${planSlug}' (${billingCycle}).` },
        { status: 422 },
      )
    }

    // Create a non-access placeholder subscription so pending payments always
    // have a valid FK. It expires immediately and is activated by the webhook.
    let subscription = await db.subscription.findUnique({ where: { organizationId: ctx.organizationId } })
    if (!subscription) {
      const now = new Date()
      subscription = await db.subscription.create({
        data: {
          organizationId: ctx.organizationId,
          planId: plan.id,
          planVersionId: planVersion.id,
          state: 'trialing',
          trialEndsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: now,
          metadata: JSON.stringify({ checkoutPending: true }),
        },
      })
    }

    const idempotencyKey = `checkout_${ctx.organizationId}_${planSlug}_${billingCycle}_${Date.now()}`
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/app/billing?checkout=cancelled`,
      metadata: {
        organizationId: ctx.organizationId,
        planId: plan.id,
        planVersionId: planVersion.id,
        planSlug: plan.slug,
        billingCycle,
      },
      subscription_data: {
        metadata: {
          organizationId: ctx.organizationId,
          planId: plan.id,
          planVersionId: planVersion.id,
        },
        trial_period_days: 14,
      },
    }, { idempotencyKey })

    await db.payment.create({
      data: {
        organizationId: ctx.organizationId,
        subscriptionId: subscription.id,
        amount: plan.basePrice,
        currency: plan.currency,
        status: 'pending',
        paymentMethod: 'card',
        description: `Checkout: ${plan.name} (${billingCycle})`,
        idempotencyKey,
        metadata: JSON.stringify({ checkoutSessionId: session.id, planSlug, billingCycle }),
      },
    })

    return NextResponse.json({ data: { checkoutUrl: session.url, sessionId: session.id } })
  } catch (error: unknown) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json({ error: 'Unable to create checkout session' }, { status: 500 })
  }
}, { permission: 'billing.subscriptions.manage' })
