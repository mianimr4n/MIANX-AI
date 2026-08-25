import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Phase 11: Conditional query logging — only in development
const prismaLogConfig = process.env.NODE_ENV === 'development' ? ['query' as const] : ['error' as const]

// Phase 15: PostgreSQL connection pool for production
// Phase 21: Force pgbouncer=true whenever DATABASE_URL is on Supabase's
//   pooler (port 6543). Without this, Prisma's prepared-statement cache
//   collides with PgBouncer transaction-mode pooling under concurrent
//   serverless invocations, throwing
//   `PrismaClientUnknownRequestError: prepared statement "sN" already exists`.
const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') ?? false
const rawUrl = process.env.DATABASE_URL ?? ''
const isPooledConnection = /:6543\b|pooler\.supabase\.com/.test(rawUrl)
const extraParams = [
  'connection_limit=10',
  'pool_timeout=30',
  ...(isPooledConnection && !rawUrl.includes('pgbouncer=') ? ['pgbouncer=true'] : []),
].join('&')
const connectionPoolUrl = isPostgres
  ? rawUrl + (rawUrl.includes('?') ? '&' : '?') + extraParams
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
