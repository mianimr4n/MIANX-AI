import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const ms = await db.organizationMembership.findMany({
    include: { organization: true, roles: { include: { role: true } } },
  })
  for (const m of ms) {
    console.log(m.userId, '|', m.organization.name, '|', m.status, '|', m.roles.map(r => r.role.slug).join(','))
  }
  await db.$disconnect()
}
main()
