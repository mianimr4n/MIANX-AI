import { NextRequest, NextResponse } from 'next/server'
import { listInvoices, generateInvoice, issueInvoice, markInvoicePaid, getInvoice, getInvoiceSummary } from '@/core/billing/invoices'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')!
    const summary = searchParams.get('summary') === 'true'

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

    if (summary) {
      const data = await getInvoiceSummary(organizationId)
      return NextResponse.json({ data })
    }

    const data = await listInvoices(organizationId)
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
