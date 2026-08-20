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
    await db.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - t0
  } catch (error) {
    dbStatus = 'error'
    dbLatencyMs = -1
  }

  const totalLatency = Date.now() - startTime
  const env = process.env.NODE_ENV || 'development'

  return NextResponse.json({
    status: 'healthy',
    app: 'mianx-ai',
    version: APP_VERSION,
    phase: 11,
    environment: env,
    uptime: process.uptime ? Math.floor(process.uptime()) : null,
    checks: {
      database: { status: dbStatus, latency_ms: dbLatencyMs },
      api: { status: 'ok', latency_ms: totalLatency },
    },
    timestamp: new Date().toISOString(),
  })
}