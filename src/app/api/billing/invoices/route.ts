import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization/middleware'
import { listInvoices, generateInvoice, issueInvoice, markInvoicePaid, getInvoice, getInvoiceSummary } from '@/core/billing/invoices'
import { db } from '@/lib/db'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const summary = searchParams.get('summary') === 'true'

  // Always use the authenticated org
  const organizationId = ctx.organizationId

  if (summary) {
    const data = await getInvoiceSummary(organizationId)
    return NextResponse.json({ data })
  }

  const data = await listInvoices(organizationId)
  return NextResponse.json({ data })
}, { permission: 'billing.invoices.view' })

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json()
  const { action, ...params } = body

  switch (action) {
    case 'generate': {
      // IDOR fix: verify subscription belongs to this org
      const sub = await db.subscription.findFirst({ where: { id: params.subscriptionId, organizationId: ctx.organizationId } })
      if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      return NextResponse.json({ data: await generateInvoice(params.subscriptionId) }, { status: 201 })
    }
    case 'issue': {
      // IDOR fix: verify invoice belongs to this org's subscription
      const invoice = await db.invoice.findFirst({
        where: { id: params.invoiceId },
        include: { subscription: { select: { organizationId: true } } },
      })
      if (!invoice || invoice.subscription.organizationId !== ctx.organizationId) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      return NextResponse.json({ data: await issueInvoice(params.invoiceId) })
    }
    case 'pay': {
      const invoice = await db.invoice.findFirst({
        where: { id: params.invoiceId },
        include: { subscription: { select: { organizationId: true } } },
      })
      if (!invoice || invoice.subscription.organizationId !== ctx.organizationId) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }
      return NextResponse.json({ data: await markInvoicePaid(params.invoiceId) })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}, { permission: 'billing.invoices.manage' })
