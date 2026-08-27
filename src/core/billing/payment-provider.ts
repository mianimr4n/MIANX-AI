// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Payment Provider Abstraction
// Adapter pattern for payment providers (Stripe, etc.)
// ══════════════════════════════════════════════════════════════════

import type { PaymentProviderAdapter } from './types'
import { createHmac, timingSafeEqual } from 'crypto'

// ── Stripe Adapter — Production-ready with graceful fallback ──
// When STRIPE_SECRET_KEY is set, uses the real Stripe SDK.
// When not set, methods throw explicit configuration errors.

export class StripeAdapter implements PaymentProviderAdapter {
  name = 'stripe'
  private secretKey: string
  private webhookSecret: string
  private _stripe: import('stripe').Stripe | null = null

  constructor(secretKey: string, webhookSecret: string) {
    this.secretKey = secretKey
    this.webhookSecret = webhookSecret
  }

  private async getStripe() {
    if (!this.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Payment operations are unavailable.')
    }
    if (!this._stripe) {
      try {
        const Stripe = (await import('stripe')).default
        this._stripe = new Stripe(this.secretKey)
      } catch (err) {
        throw new Error(
          `Failed to initialize Stripe SDK. Ensure 'stripe' package is installed. ${err instanceof Error ? err.message : ''}`,
        )
      }
    }
    return this._stripe
  }

  async createCustomer(orgId: string, data: Record<string, unknown>) {
    const stripe = await this.getStripe()
    const customer = await stripe.customers.create({
      email: data.email as string | undefined,
      name: data.name as string | undefined,
      metadata: { organizationId: orgId },
    })
    return { externalId: customer.id, ...data }
  }

  async createSubscription(externalCustomerId: string, planExternalId: string) {
    const stripe = await this.getStripe()
    const subscription = await stripe.subscriptions.create({
      customer: externalCustomerId,
      items: [{ price: planExternalId }],
      trial_period_days: 14,
    })
    return { externalId: subscription.id, status: subscription.status }
  }

  async cancelSubscription(externalSubscriptionId: string) {
    const stripe = await this.getStripe()
    const subscription = await stripe.subscriptions.cancel(externalSubscriptionId)
    return { status: subscription.status }
  }

  async updatePaymentMethod(externalCustomerId: string, paymentMethodId: string) {
    const stripe = await this.getStripe()
    await stripe.customers.update(externalCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const elements = signature.split(',')
    let timestamp = ''
    let v1Signature = ''

    for (const element of elements) {
      const [key, value] = element.split('=')
      if (key === 't') timestamp = value
      if (key === 'v1') v1Signature = value
    }

    if (!timestamp || !v1Signature) return false

    // Reject old or future timestamps (5 min tolerance)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
    if (age > 300 || age < -60) return false

    const signedPayload = `${timestamp}.${payload}`
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex')

    try {
      return timingSafeEqual(Buffer.from(v1Signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  parseWebhookEvent(payload: string): { type: string; data: Record<string, unknown> } {
    try {
      const parsed = JSON.parse(payload)
      return { type: parsed.type || 'unknown', data: parsed.data || parsed }
    } catch {
      return { type: 'unknown', data: {} }
    }
  }
}

// ── Provider Registry ──

const providers = new Map<string, PaymentProviderAdapter>()

export function registerProvider(adapter: PaymentProviderAdapter) {
  providers.set(adapter.name, adapter)
}

export function getProvider(name: string): PaymentProviderAdapter | undefined {
  return providers.get(name)
}

export function listProviders() {
  return Array.from(providers.entries()).map(([name]) => ({
    name,
    configured: true,
  }))
}

/**
 * Initialize the Stripe provider if credentials are available.
 * Call this at app startup (e.g. in instrumentation.ts or a server init module).
 * No-op if STRIPE_SECRET_KEY is not set.
 */
export function initStripeProvider() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (secretKey && webhookSecret) {
    const adapter = new StripeAdapter(secretKey, webhookSecret)
    registerProvider(adapter)
    console.log('[Payment] Stripe provider registered')
  } else {
    console.log('[Payment] Stripe provider not configured (no STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET)')
  }
}

// ── Reconciliation (periodic) ──

export interface ReconciliationDiff {
  subscriptionId: string
  field: string
  localValue: string
  providerValue: string
}

export async function reconcileSubscription(_subscriptionId: string): Promise<ReconciliationDiff[]> {
  const provider = getProvider('stripe')
  if (!provider) return []

  // In production: fetch subscription from Stripe, compare with local DB state
  // const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
  // Compare state, period dates, plan, etc.
  return []
}
