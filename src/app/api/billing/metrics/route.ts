import { NextResponse } from 'next/server'
import { getBillingMetrics, checkExpiredTrials, checkExpiredSubscriptions } from '@/core/billing/subscriptions'
import { listProviders } from '@/core/billing/payment-provider'

export async function GET() {
  try {
    const metrics = await getBillingMetrics()
    const providers = listProviders()
    return NextResponse.json({ data: { ...metrics, providers } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const expiredTrials = await checkExpiredTrials()
    const expiredSubs = await checkExpiredSubscriptions()
    return NextResponse.json({ data: { expiredTrials: expiredTrials.length, expiredSubscriptions: expiredSubs.length } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}