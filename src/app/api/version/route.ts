// ══════════════════════════════════════════════════════
// MIANX.AI — Deployment Version Verification Endpoint
// Phase 17: Immediately shows which commit is deployed
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// Cache the server start time on first import (approximates deploy time)
const SERVER_STARTED_AT = new Date().toISOString()

export async function GET() {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    'unknown'

  // Short SHA for display (first 7 chars)
  const shortSha = commitSha !== 'unknown' ? commitSha.slice(0, 7) : 'unknown'

  return NextResponse.json({
    application: 'MIANX.AI',
    version: APP_VERSION,
    phase: 17,
    gitCommit: shortSha,
    gitCommitFull: commitSha.length > 7 ? commitSha : undefined,
    environment: process.env.NODE_ENV || 'development',
    deployedAt: SERVER_STARTED_AT,
    runtime: process.env.VERCEL ? 'vercel' : process.env.DOCKER_CONTAINER ? 'docker' : 'standalone',
    nodeEnv: process.env.NODE_ENV || 'not set',
  })
}
