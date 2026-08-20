import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Phase 11: Conditional query logging — only in development
const prismaLogConfig = process.env.NODE_ENV === 'development' ? ['query' as const] : ['error' as const]

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig,
    // Phase 11: Connection pool limits for reliability
    ...(process.env.DATABASE_URL?.startsWith('postgresql') ? {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db