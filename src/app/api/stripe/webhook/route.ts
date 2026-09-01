// MIANX.AI — Stripe Webhook Endpoint
// Signature-verified, timestamp-checked, idempotent Stripe event processing.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHmac, timingSafeEqual } from 'crypto'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

function verifyStripeSignature(payload: string, signature: string): boolean {
  if (!STRIPE_WEBHOOK_SECRET) return false
  let timestamp = ''
  let v1Signature = ''
  for (const element of signature.split(',')) {
    const [key, value] = element.split('=')
    if (key === 't') timestamp = value
    if (key === 'v1') v1Signature = value
  }
  if (!timestamp || !v1Signature) return false
  const timestampSeconds = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(timestampSeconds)) return false
  const webhookAge = Math.floor(Date.now() / 1000) - timestampSeconds
  if (webhookAge > 300 || webhookAge < -60) return false
  const expectedSignature = createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest('hex')
  try {
    const provided = Buffer.from(v1Signature, 'utf8')
    const expected = Buffer.from(expectedSignature, 'utf8')
    return provided.length === expected.length && timingSafeEqual(provided, expected)
  } catch {
    return false
  }
}

interface StripeEvent {
  id: string
  type: string
  data?: { object?: Record<string, unknown> }
  [key: string]: unknown
}

function getEventObject(event: StripeEvent): Record<string, unknown> | null {
  return event.data?.object && typeof event.data.object === 'object' ? event.data.object : null
}

async function resolveOrganizationId(event: StripeEvent): Promise<string | null> {
  const object = getEventObject(event)
  if (!object) return null
  const metadata = object.metadata as Record<string, string> | undefined
  if (metadata?.organizationId) return metadata.organizationId
  const stripeSubscriptionId = (object.subscription as string | undefined) || (object.id as string | undefined)
  if (!stripeSubscriptionId) return null
  const subscription = await db.subscription.findFirst({ where: { stripeSubscriptionId }, select: { organizationId: true } })
  return subscription?.organizationId || null
}

async function claimStripeEvent(event: StripeEvent, organizationId: string): Promise<'claimed' | 'already_processed' | 'retry'> {
  try {
    const existing = await db.event.findUnique({ where: { id: event.id }, select: { status: true } })
    if (existing?.status === 'delivered') return 'already_processed'
    if (!existing) {
      await db.event.create({
        data: {
          id: event.id,
          eventType: `stripe.${event.type}`,
          eventVersion: '1',
          organizationId,
          sourceType: 'stripe',
          sourceId: event.id,
          payload: JSON.stringify(event),
          status: 'pending',
        },
      })
      return 'claimed'
    }
    await db.event.update({ where: { id: event.id }, data: { status: 'pending' } })
    return 'retry'
  } catch (error) {
    const existing = await db.event.findUnique({ where: { id: event.id }, select: { status: true } })
    if (existing?.status === 'delivered') return 'already_processed'
    if (existing) return 'retry'
    throw error
  }
}

async function markStripeEvent(eventId: string, status: 'delivered' | 'failed') {
  await db.event.update({ where: { id: eventId }, data: { status } }).catch(() => undefined)
}

async function handleCheckoutCompleted(event: StripeEvent) {
  const session = getEventObject(event)
  if (!session) return
  const metadata = session.metadata as Record<string, string> | undefined
  const orgId = metadata?.organizationId
  const planId = metadata?.planId
  const planVersionId = metadata?.planVersionId
  const stripeSubId = session.subscription as string | undefined
  const stripeCustId = session.customer as string | undefined
  if (!orgId || !stripeSubId || !planVersionId) throw new Error('checkout.session.completed missing required metadata')

  let periodStart = new Date()
  let periodEnd = new Date(Date.now() + 30 * 86400000)
  if (STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(STRIPE_SECRET_KEY)
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
      const raw = stripeSub as unknown as Record<string, unknown>
      if (typeof raw.current_period_start === 'number') periodStart = new Date(raw.current_period_start * 1000)
      if (typeof raw.current_period_end === 'number') periodEnd = new Date(raw.current_period_end * 1000)
    } catch (error) {
      console.warn('[Stripe Webhook] Could not retrieve subscription period:', error)
    }
  }

  await db.subscription.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, planId: planId || undefined, planVersionId, state: 'active', stripeSubscriptionId: stripeSubId, stripeCustomerId: stripeCustId || undefined, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
    update: { planId: planId || undefined, planVersionId, state: 'active', stripeSubscriptionId: stripeSubId, stripeCustomerId: stripeCustId || undefined, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd },
  })
}

async function handleInvoicePaid(event: StripeEvent) {
  const invoice = getEventObject(event)
  if (!invoice) return
  const stripeSubId = invoice.subscription as string | undefined
  if (!stripeSubId) return
  const subscription = await db.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } })
  if (!subscription) throw new Error('invoice.paid received before local subscription exists')

  const amountPaid = Number(invoice.amount_paid || 0) / 100
  const currency = String(invoice.currency || 'usd').toUpperCase()
  const stripeInvoiceId = String(invoice.id)
  const periodStart = new Date(Number(invoice.period_start || 0) * 1000)
  const periodEnd = new Date(Number(invoice.period_end || 0) * 1000)
  const invoiceNumber = `STRIPE-${stripeInvoiceId.replace(/^in_/, '')}`

  await db.subscription.update({ where: { id: subscription.id }, data: { state: 'active', currentPeriodStart: periodStart, currentPeriodEnd: periodEnd } })

  const createdInvoice = await db.invoice.upsert({
    where: { organizationId_invoiceNumber: { organizationId: subscription.organizationId, invoiceNumber } },
    create: {
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      invoiceNumber,
      status: 'paid',
      periodStart,
      periodEnd,
      currency,
      subtotal: amountPaid,
      total: amountPaid,
      lineItems: JSON.stringify([{ type: 'base_plan', description: `Subscription (${stripeInvoiceId})`, unitPrice: amountPaid, amount: amountPaid }]),
      issuedAt: new Date(),
      paidAt: new Date(),
    },
    update: { status: 'paid', paidAt: new Date(), total: amountPaid, subtotal: amountPaid },
  })

  const paymentIntent = invoice.payment_intent as string | undefined
  if (paymentIntent) {
    await db.payment.updateMany({
      where: { organizationId: subscription.organizationId, subscriptionId: subscription.id, status: 'pending' },
      data: { status: 'succeeded', invoiceId: createdInvoice.id, stripePaymentIntentId: paymentIntent },
    })
  }
}

async function handleSubscriptionUpdated(event: StripeEvent) {
  const stripeSub = getEventObject(event)
  if (!stripeSub) return
  const stripeSubId = String(stripeSub.id)
  const status = String(stripeSub.status)
  const subscription = await db.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } })
  if (!subscription) return
  const stateMap: Record<string, 'active' | 'trialing' | 'past_due' | 'cancelled' | 'suspended' | 'paused'> = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'cancelled', unpaid: 'suspended', paused: 'paused' }
  const newState = stateMap[status]
  if (!newState) return
  const raw = stripeSub as Record<string, unknown>
  const data: Record<string, unknown> = { state: newState }
  if (typeof raw.current_period_start === 'number') data.currentPeriodStart = new Date(raw.current_period_start * 1000)
  if (typeof raw.current_period_end === 'number') data.currentPeriodEnd = new Date(raw.current_period_end * 1000)
  await db.subscription.update({ where: { id: subscription.id }, data })
}

async function handleSubscriptionDeleted(event: StripeEvent) {
  const stripeSub = getEventObject(event)
  if (!stripeSub) return
  const subscription = await db.subscription.findFirst({ where: { stripeSubscriptionId: String(stripeSub.id) } })
  if (!subscription) return
  const endedAt = stripeSub.ended_at as number | undefined
  await db.subscription.update({ where: { id: subscription.id }, data: { state: 'cancelled', canceledAt: new Date(), expiresAt: endedAt ? new Date(endedAt * 1000) : subscription.currentPeriodEnd } })
}

async function handlePaymentFailed(event: StripeEvent) {
  const invoice = getEventObject(event)
  if (!invoice) return
  const stripeSubId = invoice.subscription as string | undefined
  if (!stripeSubId) return
  const sub = await db.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } })
  if (sub) await db.subscription.update({ where: { id: sub.id }, data: { state: 'past_due' } })
}

const EVENT_HANDLERS: Record<string, (event: StripeEvent) => Promise<void>> = {
  'checkout.session.completed': handleCheckoutCompleted,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handlePaymentFailed,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
}

export async function POST(req: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature') || ''
  if (!signature || !verifyStripeSignature(rawBody, signature)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  let event: StripeEvent
  try { event = JSON.parse(rawBody) as StripeEvent } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!event.id || !event.type) return NextResponse.json({ error: 'Invalid Stripe event' }, { status: 400 })

  const handler = EVENT_HANDLERS[event.type]
  if (!handler) return NextResponse.json({ received: true, type: event.type, handled: false })
  const organizationId = await resolveOrganizationId(event)
  if (!organizationId) return NextResponse.json({ error: 'Unable to resolve organization' }, { status: 400 })

  const claim = await claimStripeEvent(event, organizationId)
  if (claim === 'already_processed') return NextResponse.json({ received: true, idempotent: true })

  try {
    await handler(event)
    await markStripeEvent(event.id, 'delivered')
    return NextResponse.json({ received: true, type: event.type })
  } catch (error) {
    await markStripeEvent(event.id, 'failed')
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }
}
