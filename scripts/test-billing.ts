import { randomUUID } from 'crypto'
  const prisma = new PrismaClient()
  const { db } = prisma.
import('@prisma/client').default(dbUrl)

  const { parseVersionFeatures } = require('../src/core/billing/plans').parseVersionFeatures
  const { checkEntitlement } = require('../src/core/billing/entitlements').checkEntitlement
  const { recordUsage, ensureDefaultMeters, getCurrentUsage, getUsageSnapshot, getAiBudgetStatus } = require('../src/core/billing/usage').usage')
  const { generateInvoice, issueInvoice, markInvoicePaid, listInvoices, getInvoiceSummary } = require('../src/core/billing/invoices')

  const { StripeAdapter, registerProvider, listProviders } = require('../src/core/billing/payment-provider')
  const organization = await prisma.organization.create({ data: { name: 'Test Org', slug: 'test-org', status: 'active', currency: 'USD', timezone: 'UTC' } })
  console.log('Org:', organization.id)
  const plan = await prisma.plan.create({ data: { name: 'Test Plan', slug: 'test-plan', billingCycle: 'monthly', basePrice: 29, status: 'active' } })
  const pv = await prisma.planVersion.create({ data: { planId: plan.id, version: 1, features: JSON.stringify([{ key: 'domain.poultry', name: 'Poultry OS', category: 'domain' }]), seatAllowance: 3, aiTokenAllowance: 100000, status: 'active' } })
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  await prisma.subscription.create({ data: { organizationId: organization.id, planId: plan.id, planVersionId: pv.id, state: 'active', currentPeriodStart: now, currentPeriodEnd: end, seatCount: 2 } })
  console.log('Sub state:', sub.state, 'planVersionId:', sub.planVersionId)
  const parsed = parseVersionFeatures(pv)
  console.log('Parsed features:', JSON.stringify(parsed.features))
  try {
    const r = await checkEntitlement(organization.id, 'domain.poultry')
    console.log('Result:', JSON.stringify(r))
  } catch(e) {
    console.log('ERROR:', e.message)
    console.log(e.stack)
  }
  await prisma.usageRecord.deleteMany({ where: { organizationId: organization.id } })
  await prisma.invoice.deleteMany({ where: { organizationId: organization.id } })
  await prisma.subscription.deleteMany({ where: { organizationId: organization.id } })
  await prisma.planVersion.deleteMany({ where: { planId: plan.id } })
  await prisma.plan.deleteMany({ where: { id: plan.id } })
  console.log('Done')
