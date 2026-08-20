import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Phase 11: Conditional query logging — only in development
const prismaLogConfig = process.env.NODE_ENV === 'development' ? ['query' as const] : ['error' as const]

// Phase 15: PostgreSQL connection pool for production
const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') ?? false
const connectionPoolUrl = isPostgres
  ? process.env.DATABASE_URL! + (process.env.DATABASE_URL!.includes('?') ? '&' : '?') +
    'connection_limit=10&pool_timeout=30'
  : undefined

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig,
    ...(isPostgres && connectionPoolUrl ? {
      datasources: {
        db: {
          url: connectionPoolUrl,
        },
      },
    } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
