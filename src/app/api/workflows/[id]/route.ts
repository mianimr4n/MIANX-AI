// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Workflow Detail API
// GET    /api/workflows/:id     — Get workflow with run count
// PATCH  /api/workflows/:id     — Update workflow
// DELETE /api/workflows/:id     — Archive workflow
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams, type AuthContext } from '@/core/authorization'
import { getWorkflow, updateWorkflow, deleteWorkflow } from '@/core/automation'
import type { UpdateWorkflowData } from '@/core/automation'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['draft', 'active', 'disabled', 'archived'] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

// GET /api/workflows/:id — Get workflow with run count
export const GET = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const workflow = await getWorkflow(id, ctx.organizationId)

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const runCount = await db.workflowRun.count({
    where: { workflowId: id },
  })

  return NextResponse.json(apiEnvelope({
    ...workflow,
    triggerConfig: JSON.parse(workflow.triggerConfig),
    steps: JSON.parse(workflow.steps),
    conditions: workflow.conditions ? JSON.parse(workflow.conditions) : null,
    retryPolicy: workflow.retryPolicy ? JSON.parse(workflow.retryPolicy) : null,
    _runCount: runCount,
  }))
}, { anyPermission: ['automation.workflows.view', 'automation.workflows.manage'] })

// PATCH /api/workflows/:id — Update workflow
export const PATCH = withAuthParams(async (request: NextRequest, ctx: AuthContext, { id }) => {
  const existing = await getWorkflow(id, ctx.organizationId)

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, description, triggerType, triggerConfig, steps, conditions, retryPolicy, timeoutSeconds, status } = body

  const updateData: UpdateWorkflowData = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'name must be at least 2 characters' },
        { status: 400 },
      )
    }
    updateData.name = name.trim()
  }

  if (description !== undefined) {
    updateData.description = typeof description === 'string' ? description.trim() : undefined
  }

  if (triggerType !== undefined) {
    if (typeof triggerType !== 'string' || triggerType.trim().length === 0) {
      return NextResponse.json(
        { error: 'triggerType must be a non-empty string' },
        { status: 400 },
      )
    }
    updateData.triggerType = triggerType.trim()
  }

  if (triggerConfig !== undefined) {
    if (typeof triggerConfig !== 'object' || triggerConfig === null) {
      return NextResponse.json(
        { error: 'triggerConfig must be an object' },
        { status: 400 },
      )
    }
    updateData.triggerConfig = triggerConfig
  }

  if (steps !== undefined) {
    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'steps must be a non-empty array' },
        { status: 400 },
      )
    }
    updateData.steps = steps
  }

  if (conditions !== undefined) {
    if (!Array.isArray(conditions)) {
      return NextResponse.json(
        { error: 'conditions must be an array' },
        { status: 400 },
      )
    }
    updateData.conditions = conditions
  }

  if (retryPolicy !== undefined) {
    if (typeof retryPolicy !== 'object' || retryPolicy === null) {
      return NextResponse.json(
        { error: 'retryPolicy must be an object' },
        { status: 400 },
      )
    }
    updateData.retryPolicy = retryPolicy
  }

  if (timeoutSeconds !== undefined) {
    if (typeof timeoutSeconds !== 'number' || timeoutSeconds < 1) {
      return NextResponse.json(
        { error: 'timeoutSeconds must be a positive number' },
        { status: 400 },
      )
    }
    updateData.timeoutSeconds = timeoutSeconds
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status as ValidStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      )
    }
    updateData.status = status as ValidStatus
  }

  const updated = await updateWorkflow(id, ctx.organizationId, updateData)

  return NextResponse.json(apiEnvelope({
    ...updated,
    triggerConfig: JSON.parse(updated.triggerConfig),
    steps: JSON.parse(updated.steps),
    conditions: updated.conditions ? JSON.parse(updated.conditions) : null,
    retryPolicy: updated.retryPolicy ? JSON.parse(updated.retryPolicy) : null,
  }))
}, { permission: 'automation.workflows.manage' })

// DELETE /api/workflows/:id — Archive workflow
export const DELETE = withAuthParams(async (_request: NextRequest, ctx: AuthContext, { id }) => {
  const existing = await getWorkflow(id, ctx.organizationId)

  if (!existing) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  const archived = await deleteWorkflow(id, ctx.organizationId)

  return NextResponse.json(apiEnvelope({
    ...archived,
    triggerConfig: JSON.parse(archived.triggerConfig),
    steps: JSON.parse(archived.steps),
    conditions: archived.conditions ? JSON.parse(archived.conditions) : null,
    retryPolicy: archived.retryPolicy ? JSON.parse(archived.retryPolicy) : null,
  }))
}, { permission: 'automation.workflows.manage' })
