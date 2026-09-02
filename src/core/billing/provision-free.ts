// MIANX.AI — Default Free Plan Provisioning
// Creates the initial free subscription for a newly-created organization.

import { db } from '@/lib/db'
import { createSubscription } from './subscriptions'

export async function provisionFreeSubscription(organizationId: string) {
  const freePlan = await db.plan.findFirst({
    where: { slug: 'free', status: 'active' },
    include: { versions: { where: { status: 'active' }, orderBy: { version: 'desc' }, take: 1 } },
  })

  if (!freePlan) {
    throw new Error('Active free plan is not configured')
  }

  const version = freePlan.versions[0]
  if (!version) {
    throw new Error('Active free plan version is not configured')
  }

  return createSubscription(organizationId, version.id, { planId: freePlan.id })
}
