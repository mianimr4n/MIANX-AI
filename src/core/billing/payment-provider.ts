// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Payment Provider Abstraction
// Adapter pattern for payment providers (Stripe, etc.)
// ══════════════════════════════════════════════════════════════════

import type { PaymentProviderAdapter } from './types'
import { createHmac } from 'crypto'

// ── Stripe Adapter (Stub — production: @stripe/stripe-js) ──

export class StripeAdapter implements PaymentProviderAdapter {
  name = 'stripe'
  private secretKey: string
  private webhookSecret: string

  constructor(secretKey: string, webhookSecret: string) {
    this.secretKey = secretKey
    this.webhookSecret = webhookSecret
  }

  async createCustomer(_orgId: string, data: Record<string, unknown>) {
    // In production: const customer = await stripe.customers.create({...})
    return { externalId: `cus_stub_${Date.now()}`, ...data }
  }

  async createSubscription(_externalCustomerId: string, _planExternalId: string) {
    // In production: const sub = await stripe.subscriptions.create({...})
    return { externalId: `sub_stub_${Date.now()}`, status: 'active' }
  }

  async cancelSubscription(externalSubscriptionId: string) {
    // In production: await stripe.subscriptions.cancel(externalSubscriptionId)
    return { status: 'canceled' }
  }

  async updatePaymentMethod(_externalCustomerId: string, _token: string) {
    // In production: await stripe.customers.update(customerId, {source: token})
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSig = createHmac('sha256', secret).update(payload).digest('hex')
    return `sha256=${expectedSig}` === signature
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
  return Array.from(providers.entries()).map(([name, adapter]) => ({
    name,
    configured: true,
  }))
}

// ── Reconciliation (periodic) ──

export interface ReconciliationDiff {
  subscriptionId: string
  field: string
  localValue: string
  providerValue: string
}

export async function reconcileSubscription(_subscriptionId: string): Promise<ReconciliationDiff[]> {
  // In production: fetch subscription from Stripe, compare with local state
  // Returns array of differences for manual review
  return []
}