// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Invoice Generation
// Creates invoices with line items, supports plan + usage billing
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import type { InvoiceLineItem, InvoiceData } from './types'
import { parseVersionFeatures } from './plans'

// ── Generate Invoice Number ──

async function nextInvoiceNumber(organizationId: string): Promise<string> {
  const last = await db.invoice.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  })
  if (!last) return 'INV-0001'
  const num = parseInt(last.invoiceNumber.replace('INV-', ''), 10)
  return `INV-${String(num + 1).padStart(4, '0')}`
}

// ── Generate Invoice for Subscription ──

export async function generateInvoice(subscriptionId: string) {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, planVersion: true, organization: true },
  })
  if (!sub) throw new Error(`Subscription ${subscriptionId} not found`)
  if (!sub.plan) throw new Error('Subscription has no plan')
  if (!sub.currentPeriodStart || !sub.currentPeriodEnd) throw new Error('Subscription has no billing period')

  const lineItems: InvoiceLineItem[] = []
  let subtotal = 0

  // 1. Base plan line
  const planAmount = sub.plan.basePrice
  lineItems.push({
    type: 'base_plan',
    description: `${sub.plan.name} (${sub.plan.billingCycle})`,
    unitPrice: planAmount,
    amount: planAmount,
  })
  subtotal += planAmount

  // 2. Extra seats (if over allowance)
  const versionData = parseVersionFeatures(sub.planVersion)
  if (sub.seatCount > versionData.seatAllowance) {
    const extraSeats = sub.seatCount - versionData.seatAllowance
    const seatPrice = planAmount * 0.1 // 10% of plan per extra seat
    const seatAmount = extraSeats * seatPrice
    lineItems.push({
      type: 'seats',
      description: `Extra seats (${extraSeats} × ${seatPrice.toFixed(2)})`,
      quantity: extraSeats,
      unitPrice: seatPrice,
      amount: seatAmount,
    })
    subtotal += seatAmount
  }

  // 3. AI usage (if over allowance)
  const { getCurrentUsage } = await import('./usage')
  const aiTokensUsed = await getCurrentUsage(sub.organizationId, 'ai.total_tokens')
  const aiAllowance = versionData.aiTokenAllowance
  if (aiTokensUsed > aiAllowance && aiAllowance > 0) {
    const overageTokens = aiTokensUsed - aiAllowance
    const overageCost = (overageTokens / 1000000) * 10 // $10 per 1M overage tokens
    if (overageCost > 0) {
      lineItems.push({
        type: 'ai_usage',
        description: `AI token overage (${(overageTokens / 1000000).toFixed(2)}M tokens)`,
        quantity: overageTokens,
        unitPrice: 10 / 1000000,
        amount: Math.round(overageCost * 100) / 100,
      })
      subtotal += Math.round(overageCost * 100) / 100
    }
  }

  // 4. Tax
  let tax = 0
  if (subtotal > 0) {
    tax = Math.round(subtotal * 0.0 * 100) / 100 // 0% tax for now, configurable per jurisdiction
  }

  const total = Math.round((subtotal + tax) * 100) / 100
  const invoiceNumber = await nextInvoiceNumber(sub.organizationId)

  const invoice = await db.invoice.create({
    data: {
      organizationId: sub.organizationId,
      subscriptionId: sub.id,
      invoiceNumber,
      status: 'draft',
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      currency: sub.plan.currency,
      subtotal,
      discount: 0,
      tax,
      total,
      lineItems: JSON.stringify(lineItems),
    },
  })

  return invoice
}

// ── Issue Invoice ──

export async function issueInvoice(invoiceId: string) {
  const now = new Date()
  const dueAt = new Date(now.getTime() + 30 * 86400000) // 30 days

  return db.invoice.update({
    where: { id: invoiceId },
    data: { status: 'issued', issuedAt: now, dueAt },
  })
}

// ── Mark Invoice Paid ──

export async function markInvoicePaid(invoiceId: string) {
  return db.invoice.update({
    where: { id: invoiceId },
    data: { status: 'paid', paidAt: new Date() },
  })
}

// ── List Invoices ──

export async function listInvoices(organizationId: string, limit: number = 20) {
  return db.invoice.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// ── Get Invoice with parsed line items ──

export async function getInvoice(invoiceId: string) {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return null

  return {
    ...invoice,
  }
}

// ── Parse Invoice Line Items ──

export function parseLineItems(lineItemsJson: string): InvoiceLineItem[] {
  return JSON.parse(lineItemsJson)
}

// ── Invoice Summary for Dashboard ──

export async function getInvoiceSummary(organizationId: string) {
  const invoices = await listInvoices(organizationId, 100)
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const outstanding = invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.total, 0)
  const overdue = invoices.filter(i => i.status === 'issued' && i.dueAt && i.dueAt < new Date()).reduce((s, i) => s + i.total, 0)

  return { total: invoices.length, totalRevenue, outstanding, overdue }
}