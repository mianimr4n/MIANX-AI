import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization/middleware'
import { getOrganizationEntitlements, checkEntitlement, checkDomainEntitlement, checkModuleEntitlement, getEntitlementSummary } from '@/core/billing/entitlements'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const featureKey = searchParams.get('featureKey')
  const domainSlug = searchParams.get('domainSlug')
  const moduleSlug = searchParams.get('moduleSlug')
  const summary = searchParams.get('summary') === 'true'

  // Always use the authenticated org, never from query params
  const organizationId = ctx.organizationId

  if (summary) {
    const data = await getEntitlementSummary(organizationId)
    return NextResponse.json({ data })
  }

  if (featureKey) {
    const data = await checkEntitlement(organizationId, featureKey)
    return NextResponse.json({ data })
  }

  if (domainSlug) {
    const data = await checkDomainEntitlement(organizationId, domainSlug)
    return NextResponse.json({ data })
  }

  if (moduleSlug) {
    const data = await checkModuleEntitlement(organizationId, moduleSlug)
    return NextResponse.json({ data })
  }

  const data = await getOrganizationEntitlements(organizationId)
  return NextResponse.json({ data })
}, { permission: 'billing.entitlements.view' })
