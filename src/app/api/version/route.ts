// ══════════════════════════════════════════════════════
// MIANX.AI — Deployment Version Verification Endpoint
// Returns only non-sensitive application version information.
// ══════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { APP_VERSION } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    application: 'MIANX.AI',
    version: APP_VERSION,
  })
}
