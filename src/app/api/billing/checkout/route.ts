// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Stripe Checkout Session
// Creates a Stripe Checkout Session for plan upgrade/purchase.
// Requires STRIPE_SECRET_KEY. Returns a checkout URL for the client.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization/middleware'
import { db } from '@/lib/db'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Plan slug → Stripe Price ID mapping (must be configured in Stripe Dashboard)
// In production, these come from the Plan model's metadata or a config table.
// For now, we look up by plan slug.

async function getOrCreateStripeCustomer(
  email: string,
  organizationId: string,
  orgName: string,
): Promise<string | null> {
  if (!STRIPE_SECRET_KEY) return null

  // Check if customer already exists
  const subscription = await db.subscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  })
  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId
  }

  try {
    // Dynamic import to avoid requiring stripe when not configured
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    const customer = await stripe.customers.create({
      email,
      metadata: { organizationId, orgName },
    })

    // Persist customer ID on subscription
    // If no subscription exists yet, create one in trialing state
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
  // ── Guard: Stripe must be configured ──
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.' },
      { status: 503 },
    )
  }

  const body = await req.json()
  const { planSlug, billingCycle = 'monthly' } = body

  if (!planSlug) {
    return NextResponse.json({ error: 'planSlug is required' }, { status: 400 })
  }

  // ── Validate plan exists and is active ──
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

  // ── Free plan: no checkout needed ──
  if (plan.basePrice === 0) {
    return NextResponse.json(
      { error: 'Free plan does not require checkout. Use the subscription API directly.' },
      { status: 400 },
    )
  }

  // ── Get or create Stripe customer ──
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
    return NextResponse.json(
      { error: 'Failed to create or retrieve Stripe customer' },
      { status: 500 },
    )
  }

  // ── Create Stripe Checkout Session ──
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    // The plan's Stripe Price ID should be stored in metadata or matched by convention.
    // For launch readiness, we use a lookup: Stripe Price IDs are stored in plan metadata.
    // Format: { "stripe_price_id_monthly": "price_xxx", "stripe_price_id_yearly": "price_yyy" }
    let planMetadata: Record<string, unknown> = {}
    try {
      planMetadata = plan.metadata ? JSON.parse(plan.metadata) : {}
    } catch { /* ignore parse errors */ }

    const priceId = planMetadata[`stripe_price_id_${billingCycle}`] as string | undefined
    if (!priceId) {
      return NextResponse.json(
        {
          error: `No Stripe Price ID configured for plan '${planSlug}' (${billingCycle}). ` +
                 `Set plan metadata: { "stripe_price_id_${billingCycle}": "price_xxx" }`,
        },
        { status: 422 },
      )
    }

    const idempotencyKey = `checkout_${ctx.organizationId}_${planSlug}_${Date.now()}`

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
        trial_period_days: plan.basePrice > 0 ? 14 : undefined,
      },
    }, {
      idempotencyKey,
    })

    // Record pending payment intent
    await db.payment.create({
      data: {
        organizationId: ctx.organizationId,
        subscriptionId: (await db.subscription.findUnique({ where: { organizationId: ctx.organizationId } }))?.id || '',
        amount: plan.basePrice,
        currency: plan.currency,
        status: 'pending',
        paymentMethod: 'card',
        description: `Checkout: ${plan.name} (${billingCycle})`,
        idempotencyKey,
        metadata: JSON.stringify({ checkoutSessionId: session.id, planSlug, billingCycle }),
      },
    })

    return NextResponse.json({
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error creating checkout session'
    console.error('[Stripe Checkout] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}, { permission: 'billing.subscriptions.manage' })
