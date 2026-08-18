import { db } from '../src/lib/db'
import { parseVersionFeatures } from '../src/core/billing/plans'
import { checkEntitlement } from '../src/core/billing/entitlements'

async function main() {
  const existingSub = await db.subscription.findFirst({ select: { organizationId: true } })
  const org = await db.organization.findFirst({
    where: existingSub ? { id: { not: existingSub.organizationId } } : undefined,
  })
  console.log('Org:', org.id, org.name)
  
  const plan = await db.plan.create({ data: { name: 'Debug Plan', slug: 'debug-plan', billingCycle: 'monthly', basePrice: 29, status: 'active', isSystem: false } })
  const pv = await db.planVersion.create({ data: { planId: plan.id, version: 1, features: JSON.stringify([{ key: 'domain.poultry', name: 'Poultry OS', category: 'domain' }]), seatAllowance: 3, aiTokenAllowance: 100000 } })
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  await db.subscription.create({ data: { organizationId: org.id, planId: plan.id, planVersionId: pv.id, state: 'active', currentPeriodStart: now, currentPeriodEnd: end, seatCount: 2 } })
  
  const sub = await db.subscription.findUnique({ where: { organizationId: org.id }, include: { planVersion: true } })
  console.log('planVersion:', sub.planVersion.id)
  console.log('planVersion.features:', sub.planVersion.features.substring(0, 80))
  
  // Direct call to parseVersionFeatures
  const parsed = parseVersionFeatures(sub.planVersion)
  console.log('parseVersionFeatures result:', JSON.stringify(parsed))
  console.log('features type:', typeof parsed.features, 'is array:', Array.isArray(parsed.features))
  
  // Now call checkEntitlement
  try {
    const result = await checkEntitlement(org.id, 'domain.poultry')
    console.log('checkEntitlement result:', JSON.stringify(result))
  } catch (e: any) {
    console.log('Error:', e.message)
    console.log('Stack:', e.stack.substring(0, 500))
  }
  
  await db.subscription.deleteMany({ where: { organizationId: org.id } })
  await db.planVersion.deleteMany({ where: { planId: plan.id } })
  await db.plan.deleteMany({ where: { id: plan.id } })
  console.log('Done')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
