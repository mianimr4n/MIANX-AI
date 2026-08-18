/**
 * @module core/automation/events
 * Event system implementing the outbox pattern.
 * Events are first persisted to the database (outbox), then dispatched
 * to in-process subscribers via the EventBus.
 */

import { db } from '@/lib/db';
import { eventBus } from './event-bus';
import type {
  EventEnvelope,
  EventHandler,
  EventFilters,
  PaginatedResult,
  PublishEventData,
} from './types';

/**
 * Convert a raw database Event row into a typed EventEnvelope.
 * JSON fields are parsed so consumers receive plain objects.
 */
function toEnvelope(row: {
  id: string;
  eventType: string;
  eventVersion: string;
  organizationId: string;
  domainId: string | null;
  sourceType: string;
  sourceId: string | null;
  actorType: string;
  actorId: string | null;
  correlationId: string | null;
  causationId: string | null;
  payload: string;
  metadata: string | null;
  status: string;
  deliveredAt: Date | null;
  createdAt: Date;
}): EventEnvelope {
  return {
    id: row.id,
    eventType: row.eventType,
    eventVersion: row.eventVersion,
    organizationId: row.organizationId,
    domainId: row.domainId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    actorType: row.actorType,
    actorId: row.actorId,
    correlationId: row.correlationId,
    causationId: row.causationId,
    payload: JSON.parse(row.payload),
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    status: row.status as EventEnvelope['status'],
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt,
  };
}

/**
 * Publish a new event to the outbox and dispatch it to subscribers.
 *
 * @param data - The event data to publish
 * @returns The created event as a typed envelope
 */
export async function publishEvent(data: PublishEventData): Promise<EventEnvelope> {
  const row = await db.event.create({
    data: {
      eventType: data.eventType,
      eventVersion: data.eventVersion ?? '1',
      organizationId: data.organizationId,
      domainId: data.domainId ?? null,
      sourceType: data.sourceType ?? 'system',
      sourceId: data.sourceId ?? null,
      actorType: data.actorType ?? 'system',
      actorId: data.actorId ?? null,
      correlationId: data.correlationId ?? null,
      causationId: data.causationId ?? null,
      payload: JSON.stringify(data.payload),
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      status: 'pending',
    },
  });

  const envelope = toEnvelope(row);

  // Dispatch asynchronously so callers are not blocked by subscribers.
  dispatchEvent(envelope).catch((err) => {
    console.error(`[events] Dispatch error for ${envelope.eventType}:`, err);
  });

  return envelope;
}

/**
 * Deliver pending events from the outbox.
 * Finds events with status 'pending', dispatches them, and marks the
 * result (delivered or failed) on the row.
 *
 * @param limit - Maximum number of events to process in one call (default 50)
 * @returns Array of delivered event envelopes
 */
export async function deliverPendingEvents(
  limit: number = 50,
): Promise<EventEnvelope[]> {
  const pending = await db.event.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const delivered: EventEnvelope[] = [];

  for (const row of pending) {
    const envelope = toEnvelope(row);

    try {
      await dispatchEvent(envelope);
      await db.event.update({
        where: { id: row.id },
        data: { status: 'delivered', deliveredAt: new Date() },
      });
      delivered.push(envelope);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.event.update({
        where: { id: row.id },
        data: { status: 'failed' },
      });
      console.error(`[events] Failed to deliver event ${row.id}:`, message);
    }
  }

  return delivered;
}

/**
 * Dispatch an event to all matching subscribers via the EventBus.
 * After dispatch, the event is marked as delivered in the outbox.
 *
 * @param event - The event envelope to dispatch
 */
export async function dispatchEvent(event: EventEnvelope): Promise<void> {
  await eventBus.emit(event);
}

/**
 * Register a subscriber for a specific event type pattern.
 *
 * @param eventType - Event type pattern (supports wildcards, e.g. 'order.*')
 * @param handler - Function to call when a matching event is dispatched
 */
export function subscribe(eventType: string, handler: EventHandler): void {
  eventBus.subscribe(eventType, handler);
}

/**
 * Remove a previously registered subscriber.
 *
 * @param eventType - The exact pattern the handler was registered with
 * @param handler - The exact handler function reference
 */
export function unsubscribe(eventType: string, handler: EventHandler): void {
  eventBus.unsubscribe(eventType, handler);
}

/**
 * Retrieve a single event by ID and organization.
 *
 * @param id - The event ID
 * @param organizationId - The organization the event belongs to
 * @returns The event envelope, or null if not found
 */
export async function getEvent(
  id: string,
  organizationId: string,
): Promise<EventEnvelope | null> {
  const row = await db.event.findUnique({
    where: { id, organizationId },
  });
  return row ? toEnvelope(row) : null;
}

/**
 * List events for an organization with optional filters and pagination.
 *
 * @param organizationId - The organization to list events for
 * @param filters - Optional filter criteria (eventType, status, actorType, domainId, date range)
 * @param page - Page number (1-based, default 1)
 * @param pageSize - Items per page (default 20)
 * @returns Paginated list of event envelopes
 */
export async function listEvents(
  organizationId: string,
  filters?: EventFilters,
  page: number = 1,
  pageSize: number = 20,
): Promise<PaginatedResult<EventEnvelope>> {
  const where: Record<string, unknown> = { organizationId };

  if (filters?.eventType) where.eventType = filters.eventType;
  if (filters?.status) where.status = filters.status;
  if (filters?.actorType) where.actorType = filters.actorType;
  if (filters?.domainId) where.domainId = filters.domainId;

  if (filters?.from || filters?.to) {
    const createdAt: Record<string, unknown> = {};
    if (filters.from) (createdAt as Record<string, unknown>).gte = filters.from;
    if (filters.to) (createdAt as Record<string, unknown>).lte = filters.to;
    where.createdAt = createdAt;
  }

  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    db.event.count({ where }),
  ]);

  return {
    data: rows.map(toEnvelope),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export { toEnvelope };
