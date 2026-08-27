// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Stripe Webhook Endpoint
// Receives and processes Stripe events (invoice.paid, customer.subscription.*,
// checkout.session.completed, etc.) with signature verification and idempotency.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHmac, timingSafeEqual } from 'crypto'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// ── Signature Verification ──

function verifyStripeSignature(payload: string, signature: string): boolean {
  if (!STRIPE_WEBHOOK_SECRET) return false

  const elements = signature.split(',')
  let timestamp = ''
  let v1Signature = ''

  for (const element of elements) {
    const [key, value] = element.split('=')
    if (key === 't') timestamp = value
    if (key === 'v1') v1Signature = value
  }

  if (!timestamp || !v1Signature) return false

  // Check timestamp freshness (5 minute tolerance)
  const webhookAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
  if (webhookAge > 300 || webhookAge < -60) {
    console.warn('[Stripe Webhook] Rejected: timestamp too old or future')
    return false
  }

  const signedPayload = `${timestamp}.${payload}`
  const expectedSignature = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex')

  try {
    return timingSafeEqual(Buffer.from(v1Signature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

// ── Idempotency Guard ──

async function isEventProcessed(stripeEventId: string): Promise<boolean> {
  const existing = await db.payment.findFirst({
    where: { metadata: { contains: stripeEventId } },
  })
  return !!existing
}

// ── Type-safe event data access ──

function getEventObject(event: StripeEvent): Record<string, unknown> | null {
  const data = event.data
  if (data && typeof data === 'object' && 'object' in data) {
    return data.object as Record<string, unknown>
  }
  return null
}

interface StripeEvent {
  id: string
  type: string
  data?: {
    object?: Record<string, unknown>
  }
  [key: string]: unknown
}

// ── Event Handlers ──

async function handleCheckoutCompleted(event: StripeEvent) {
  const session = getEventObject(event)
  if (!session) return

  const metadata = session.metadata as Record<string, string> | undefined
  const orgId = metadata?.organizationId
  const planId = metadata?.planId
  const planVersionId = metadata?.planVersionId
  const stripeSubId = session.subscription as string | undefined
  const stripeCustId = session.customer as string | undefined

  if (!orgId || !stripeSubId) {
    console.error('[Stripe Webhook] checkout.session.completed missing orgId or subscription')
    return
  }

  // Upsert subscription with Stripe IDs
  const existingSub = await db.subscription.findUnique({ where: { organizationId: orgId } })

  if (existingSub) {
    await db.subscription.update({
      where: { organizationId: orgId },
      data: {
        planId: planId || undefined,
        planVersionId: planVersionId || existingSub.planVersionId,
        state: 'active',
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId: stripeCustId || undefined,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    })
  } else {
    await db.subscription.create({
      data: {
        organizationId: orgId,
        planId: planId || undefined,
        planVersionId: planVersionId || '',
        state: 'active',
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId: stripeCustId || undefined,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    })
  }

  console.log(`[Stripe Webhook] Subscription activated for org ${orgId}, Stripe sub: ${stripeSubId}`)
}

async function handleInvoicePaid(event: StripeEvent) {
  const invoice = getEventObject(event)
  if (!invoice) return

  const stripeSubId = invoice.subscription as string | undefined
  const amountPaid = ((invoice.amount_paid as number) || 0) / 100
  const currency = ((invoice.currency as string) || 'usd').toUpperCase()
  const stripeInvoiceId = invoice.id as string
  const periodStart = new Date(((invoice.period_start as number) || 0) * 1000)
  const periodEnd = new Date(((invoice.period_end as number) || 0) * 1000)

  if (!stripeSubId) return

  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  })
  if (!subscription) {
    console.error(`[Stripe Webhook] invoice.paid: no subscription found for Stripe sub ${stripeSubId}`)
    return
  }

  // Update subscription period
  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      state: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  })

  // Generate invoice record
  const invoiceCount = await db.invoice.count({
    where: { organizationId: subscription.organizationId },
  })
  const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`

  await db.invoice.create({
    data: {
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      invoiceNumber,
      status: 'paid',
      periodStart,
      periodEnd,
      currency,
      subtotal: amountPaid,
      total: amountPaid,
      lineItems: JSON.stringify([
        { type: 'base_plan', description: `Subscription (${stripeInvoiceId})`, unitPrice: amountPaid, amount: amountPaid },
      ]),
      issuedAt: new Date(),
      paidAt: new Date(),
    },
  })

  console.log(`[Stripe Webhook] Invoice paid: ${invoiceNumber} ($${amountPaid} ${currency}) for org ${subscription.organizationId}`)
}

async function handleSubscriptionUpdated(event: StripeEvent) {
  const stripeSub = getEventObject(event)
  if (!stripeSub) return

  const stripeSubId = stripeSub.id as string
  const status = stripeSub.status as string

  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  })
  if (!subscription) return

  const stateMap: Record<string, 'active' | 'trialing' | 'past_due' | 'cancelled' | 'suspended' | 'paused'> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'suspended',
    paused: 'paused',
  }

  const newState = stateMap[status]
  if (newState) {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { state: newState },
    })
    console.log(`[Stripe Webhook] Subscription ${stripeSubId} state updated: ${status} -> ${newState}`)
  }
}

async function handleSubscriptionDeleted(event: StripeEvent) {
  const stripeSub = getEventObject(event)
  if (!stripeSub) return

  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSub.id as string },
  })
  if (!subscription) return

  const endedAt = stripeSub.ended_at as number | undefined
  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      state: 'cancelled',
      canceledAt: new Date(),
      expiresAt: new Date((endedAt || Date.now() / 1000 + 2592000) * 1000),
    },
  })

  console.log(`[Stripe Webhook] Subscription deleted: ${stripeSub.id} for org ${subscription.organizationId}`)
}

async function handlePaymentFailed(event: StripeEvent) {
  const invoice = getEventObject(event)
  if (!invoice) return
  const stripeSubId = invoice.subscription as string | undefined
  if (!stripeSubId) return

  const sub = await db.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } })
  if (sub) {
    await db.subscription.update({ where: { id: sub.id }, data: { state: 'past_due' } })
  }
}

// ── Event Dispatch Table ──

const EVENT_HANDLERS: Record<string, (event: StripeEvent) => Promise<void>> = {
  'checkout.session.completed': handleCheckoutCompleted,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handlePaymentFailed,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
}

// ── Main Handler ──

export async function POST(req: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  if (!signature) {
    console.warn('[Stripe Webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  if (!verifyStripeSignature(rawBody, signature)) {
    console.warn('[Stripe Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: StripeEvent
  try {
    event = JSON.parse(rawBody) as StripeEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.type
  const eventId = event.id

  // Idempotency check
  if (await isEventProcessed(eventId)) {
    console.log(`[Stripe Webhook] Event ${eventId} already processed, skipping`)
    return NextResponse.json({ received: true, idempotent: true })
  }

  const handler = EVENT_HANDLERS[eventType]
  if (handler) {
    try {
      await handler(event)
      return NextResponse.json({ received: true, type: eventType })
    } catch (error) {
      console.error(`[Stripe Webhook] Handler error for ${eventType}:`, error)
      return NextResponse.json({ error: 'Handler error' }, { status: 500 })
    }
  }

  // Unhandled event type
  console.log(`[Stripe Webhook] Unhandled event type: ${eventType}`)
  return NextResponse.json({ received: true, type: eventType, handled: false })
}
