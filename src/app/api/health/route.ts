import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  let dbStatus = 'ok'
  let dbLatencyMs = 0

  try {
    const t0 = Date.now()
    await db.$queryRaw`SELECT 1 as ok`
    dbLatencyMs = Date.now() - t0
  } catch {
    dbStatus = 'error'
    dbLatencyMs = -1
  }

  const totalLatency = Date.now() - startTime

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    app: 'mianx-ai',
    version: APP_VERSION,
    checks: {
      database: { status: dbStatus, latency_ms: dbLatencyMs },
      api: { status: 'ok', latency_ms: totalLatency },
    },
    timestamp: new Date().toISOString(),
  })
}
