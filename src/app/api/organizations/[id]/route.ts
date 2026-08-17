// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Single Organization API
// GET    /api/organizations/:id  — Get organization detail
// PATCH  /api/organizations/:id  — Update organization
// DELETE /api/organizations/:id  — Archive organization
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const org = await db.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, teams: true, settings: true, auditLogs: true } },
        domains: { include: { domain: true } },
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({ data: org })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, timezone, locale, currency, status } = body

    const org = await db.organization.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(timezone && { timezone }),
        ...(locale && { locale }),
        ...(currency && { currency }),
        ...(status && { status }),
      },
    })

    return NextResponse.json({ data: org })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.organization.update({
      where: { id },
      data: { status: 'archived' },
    })
    return NextResponse.json({ data: { id, status: 'archived' } })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to archive organization' }, { status: 500 })
  }
}