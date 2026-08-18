// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Workflows API
// GET    /api/workflows        — List organization workflows
// POST   /api/workflows        — Create a new workflow
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthContext } from '@/core/authorization'
import { createWorkflow, listWorkflows } from '@/core/automation'
import type { CreateWorkflowData, TriggerConfig, WorkflowStep, WorkflowCondition, RetryPolicy } from '@/core/automation'
import { db } from '@/lib/db'
import { apiEnvelope } from '@/core/tenancy/utils'

export const dynamic = 'force-dynamic'

const VALID_WORKFLOW_STATUSES = ['draft', 'active', 'disabled', 'archived'] as const

type WorkflowStatusFilter = (typeof VALID_WORKFLOW_STATUSES)[number]

// GET /api/workflows — List organization workflows (with optional status filter)
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const { searchParams } = request.nextUrl
  const rawStatus = searchParams.get('status')

  if (rawStatus && !VALID_WORKFLOW_STATUSES.includes(rawStatus as WorkflowStatusFilter)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_WORKFLOW_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  let workflows
  if (rawStatus) {
    workflows = await db.workflow.findMany({
      where: { organizationId: ctx.organizationId, status: rawStatus as WorkflowStatusFilter },
      orderBy: { createdAt: 'desc' },
    })
  } else {
    workflows = await listWorkflows(ctx.organizationId)
  }

  // Parse JSON fields for each workflow
  const parsed = workflows.map((wf) => ({
    ...wf,
    triggerConfig: JSON.parse(wf.triggerConfig),
    steps: JSON.parse(wf.steps),
    conditions: wf.conditions ? JSON.parse(wf.conditions) : null,
    retryPolicy: wf.retryPolicy ? JSON.parse(wf.retryPolicy) : null,
  }))

  return NextResponse.json(apiEnvelope(parsed))
}, { anyPermission: ['automation.workflows.view', 'automation.workflows.manage'] })

// POST /api/workflows — Create a new workflow
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json()
  const { name, slug, description, triggerType, triggerConfig, steps, conditions, retryPolicy, timeoutSeconds } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'name is required (min 2 characters)' },
      { status: 400 },
    )
  }

  if (!slug || typeof slug !== 'string' || slug.trim().length < 2) {
    return NextResponse.json(
      { error: 'slug is required (min 2 characters)' },
      { status: 400 },
    )
  }

  if (!triggerConfig || typeof triggerConfig !== 'object') {
    return NextResponse.json(
      { error: 'triggerConfig is required and must be an object' },
      { status: 400 },
    )
  }

  if (!Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json(
      { error: 'steps is required and must be a non-empty array' },
      { status: 400 },
    )
  }

  // Validate each step has id, name, type
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as WorkflowStep
    if (!step.id || typeof step.id !== 'string') {
      return NextResponse.json(
        { error: `steps[${i}].id is required` },
        { status: 400 },
      )
    }
    if (!step.name || typeof step.name !== 'string') {
      return NextResponse.json(
        { error: `steps[${i}].name is required` },
        { status: 400 },
      )
    }
    const validStepTypes = ['action', 'condition', 'approval', 'ai_decision', 'delay']
    if (!validStepTypes.includes(step.type)) {
      return NextResponse.json(
        { error: `steps[${i}].type must be one of: ${validStepTypes.join(', ')}` },
        { status: 400 },
      )
    }
  }

  if (timeoutSeconds !== undefined && (typeof timeoutSeconds !== 'number' || timeoutSeconds < 1)) {
    return NextResponse.json(
      { error: 'timeoutSeconds must be a positive number' },
      { status: 400 },
    )
  }

  const createData: CreateWorkflowData = {
    organizationId: ctx.organizationId,
    name: name.trim(),
    slug: slug.trim(),
    description: typeof description === 'string' ? description.trim() : undefined,
    triggerType: typeof triggerType === 'string' ? triggerType : 'event',
    triggerConfig: triggerConfig as TriggerConfig,
    steps: steps as WorkflowStep[],
    conditions: Array.isArray(conditions) ? conditions as WorkflowCondition[] : undefined,
    retryPolicy: retryPolicy as RetryPolicy | undefined,
    timeoutSeconds: typeof timeoutSeconds === 'number' ? timeoutSeconds : undefined,
  }

  const workflow = await createWorkflow(createData)

  return NextResponse.json(apiEnvelope({
    ...workflow,
    triggerConfig: JSON.parse(workflow.triggerConfig),
    steps: JSON.parse(workflow.steps),
    conditions: workflow.conditions ? JSON.parse(workflow.conditions) : null,
    retryPolicy: workflow.retryPolicy ? JSON.parse(workflow.retryPolicy) : null,
  }), { status: 201 })
}, { permission: 'automation.workflows.manage' })
