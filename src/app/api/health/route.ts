import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  let dbStatus = 'ok'
  let dbLatencyMs = 0

  try {
    const t0 = Date.now()
    await db.organization.count()
    dbLatencyMs = Date.now() - t0
  } catch (error) {
    dbStatus = 'error'
    dbLatencyMs = -1
  }

  const totalLatency = Date.now() - startTime

  return NextResponse.json({
    status: 'healthy',
    app: 'mianx-ai',
    version: '0.6.0',
    phase: 9,
    checks: {
      database: { status: dbStatus, latency_ms: dbLatencyMs },
      api: { status: 'ok', latency_ms: totalLatency },
    },
    timestamp: new Date().toISOString(),
  })
}
