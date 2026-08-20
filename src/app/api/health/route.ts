import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/constants'
import { runPreflight } from '@/lib/preflight'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  let dbStatus = 'ok'
  let dbLatencyMs = 0

  try {
    const t0 = Date.now()
    await db.$queryRaw`SELECT 1 as ok`
    dbLatencyMs = Date.now() - t0
  } catch (error) {
    dbStatus = 'error'
    dbLatencyMs = -1
  }

  const totalLatency = Date.now() - startTime
  const env = process.env.NODE_ENV || 'development'
  const preflight = runPreflight()

  return NextResponse.json({
    status: preflight.ready && dbStatus === 'ok' ? 'healthy' : 'degraded',
    app: 'mianx-ai',
    version: APP_VERSION,
    phase: 15,
    environment: env,
    uptime: process.uptime ? Math.floor(process.uptime()) : null,
    checks: {
      database: { status: dbStatus, latency_ms: dbLatencyMs },
      api: { status: 'ok', latency_ms: totalLatency },
      preflight: {
        ready: preflight.ready,
        checks: preflight.checks.map(c => ({
          name: c.name,
          status: c.status,
          message: c.message,
          ...(c.variable ? { variable: c.variable } : {}),
        })),
      },
    },
    timestamp: new Date().toISOString(),
  })
}
