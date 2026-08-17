// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Audit Logs API
// GET /api/audit-logs — List audit logs
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const limit = parseInt(searchParams.get('limit') || '50')
    const organizationId = searchParams.get('organizationId')

    const logs = await db.auditLog.findMany({
      ...(organizationId ? { where: { organizationId } } : {}),
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: logs,
      meta: { count: logs.length },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}