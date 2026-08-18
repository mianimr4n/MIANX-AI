import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationEntitlements, checkEntitlement, checkDomainEntitlement, checkModuleEntitlement, getEntitlementSummary } from '@/core/billing/entitlements'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')!
    const featureKey = searchParams.get('featureKey')
    const domainSlug = searchParams.get('domainSlug')
    const moduleSlug = searchParams.get('moduleSlug')
    const summary = searchParams.get('summary') === 'true'

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })
    }

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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
