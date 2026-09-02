import { NextResponse } from 'next/server'
import { withAuth } from '@/core/authorization/middleware'
import { getBillingMetrics, checkExpiredTrials, checkExpiredSubscriptions } from '@/core/billing/subscriptions'
import { listProviders } from '@/core/billing/payment-provider'
import { requirePlatformAdmin } from '@/lib/platform-admin'

export const GET = withAuth(async (_req, ctx) => {
  requirePlatformAdmin(ctx.user.email)
  const metrics = await getBillingMetrics()
  const providers = listProviders()
  return NextResponse.json({ data: { ...metrics, providers } })
}, { permission: 'billing.metrics.admin' })

export const POST = withAuth(async (_req, ctx) => {
  requirePlatformAdmin(ctx.user.email)
  const expiredTrials = await checkExpiredTrials()
  const expiredSubs = await checkExpiredSubscriptions()
  return NextResponse.json({ data: { expiredTrials: expiredTrials.length, expiredSubscriptions: expiredSubs.length } })
}, { permission: 'billing.metrics.admin' })
