import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization/middleware'
import { listInvoices, generateInvoice, issueInvoice, markInvoicePaid, getInvoice, getInvoiceSummary } from '@/core/billing/invoices'

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

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const { action, ...params } = body

  switch (action) {
    case 'generate':
      return NextResponse.json({ data: await generateInvoice(params.subscriptionId) }, { status: 201 })
    case 'issue':
      return NextResponse.json({ data: await issueInvoice(params.invoiceId) })
    case 'pay':
      return NextResponse.json({ data: await markInvoicePaid(params.invoiceId) })
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}, { permission: 'billing.invoices.manage' })
