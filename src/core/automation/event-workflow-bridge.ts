/**
 * @module core/automation/event-workflow-bridge
 * Connects the event bus to the workflow engine.
 * When an event is published, this subscriber finds all active workflows
 * whose triggerConfig.eventType matches, and triggers them.
 *
 * This is the glue that makes "event-driven workflows" work.
 */

import { db } from '@/lib/db';
import { triggerWorkflow } from './workflow-engine';
import type { EventEnvelope } from './types';
import { subscribe } from './events';

/**
 * Handler that matches events to workflows and triggers them.
 * Registered once at module load time.
 */
async function handleEventForWorkflows(event: EventEnvelope): Promise<void> {
  // Find all active workflows for this org that listen to this event type
  const workflows = await db.workflow.findMany({
    where: {
      organizationId: event.organizationId,
      status: 'active',
      triggerType: 'event',
    },
  });

  for (const workflow of workflows) {
    let triggerConfig: { eventType?: string };
    try {
      triggerConfig = JSON.parse(workflow.triggerConfig);
    } catch {
      continue;
    }

    // Match event type (exact or wildcard)
    if (!triggerConfig.eventType) continue;

    const pattern = triggerConfig.eventType;
    if (!matchEventType(pattern, event.eventType)) continue;

    // Trigger the workflow asynchronously — don't block other handlers
    triggerWorkflow(workflow.id, event.organizationId, event.payload as Record<string, unknown>, event.id).catch(
      (err) => {
        console.error(
          `[event-workflow-bridge] Failed to trigger workflow ${workflow.slug} (${workflow.id}) for event ${event.eventType}:`,
          err,
        );
      },
    );
  }
}

/**
 * Simple event type matching with wildcard support.
 * - Exact: 'order.created' === 'order.created'
 * - Wildcard suffix: 'order.*' matches 'order.created'
 * - Full wildcard: '*' matches everything
 */
function matchEventType(pattern: string, eventType: string): boolean {
  if (pattern === '*' || pattern === eventType) return true;
  if (!pattern.includes('*')) return false;

  const parts = pattern.split('*');
  if (parts.length !== 2) return false;

  const [prefix, suffix] = parts;
  if (prefix && suffix) {
    return eventType.startsWith(prefix) && eventType.endsWith(suffix);
  }
  if (prefix) return eventType.startsWith(prefix);
  if (suffix) return eventType.endsWith(suffix);

  return false;
}

/**
 * Initialize the event-workflow bridge.
 * Call this once at app startup (e.g. in a layout or instrumentation file).
 * Subscribes to all events ('*') and routes them to matching workflows.
 */
export function initEventWorkflowBridge(): void {
  subscribe('*', handleEventForWorkflows);
  console.log('[event-workflow-bridge] Initialized — all events will be routed to matching workflows');
}

export { matchEventType };
