/**
 * @module core/automation/event-bus
 * Lightweight in-process event bus with pattern matching support.
 * Supports exact event type matching and wildcard patterns (e.g. 'poultry.*').
 */

import type { EventEnvelope, EventHandler } from './types';

/**
 * Subscriber entry storing the pattern and handler reference.
 * The `pattern` may contain a single `*` wildcard that matches one segment.
 */
interface Subscription {
  pattern: string;
  handler: EventHandler;
}

/**
 * Tests whether an event type matches a pattern.
 * Supports:
 *  - Exact match: 'order.created' === 'order.created'
 *  - Wildcard suffix: 'order.*' matches 'order.created', 'order.updated'
 *  - Wildcard prefix: '*.created' matches 'order.created'
 *  - Full wildcard: '*' matches everything
 *
 * @param pattern - The subscription pattern (may contain `*`)
 * @param eventType - The concrete event type to test
 * @returns True when the event type satisfies the pattern
 */
function matchPattern(pattern: string, eventType: string): boolean {
  if (pattern === '*' || pattern === eventType) return true;

  // Only support a single `*` in the pattern for simplicity and performance.
  if (!pattern.includes('*')) return false;

  const parts = pattern.split('*');
  if (parts.length !== 2) return false;

  const [prefix, suffix] = parts;

  if (prefix && suffix) {
    // Both prefix and suffix: e.g. 'order.*.done' — not supported (single * only)
    // We interpret as prefix-or-suffix for flexibility
    return eventType.startsWith(prefix) && eventType.endsWith(suffix);
  }

  if (prefix) {
    // Wildcard suffix: 'order.*'
    return eventType.startsWith(prefix);
  }

  if (suffix) {
    // Wildcard prefix: '*.created'
    return eventType.endsWith(suffix);
  }

  // Lone '*' case handled at the top
  return false;
}

/**
 * In-process event bus that dispatches events to registered subscribers.
 *
 * Usage:
 * ```ts
 * eventBus.subscribe('order.*', async (event) => { ... });
 * await eventBus.emit(eventEnvelope);
 * ```
 */
class EventBus {
  private subscriptions: Subscription[] = [];

  /**
 * Register a handler for events matching the given pattern.
 *
 * @param pattern - Event type pattern (supports `*` wildcard)
 * @param handler - Async or sync function to call when a matching event is emitted
 */
  subscribe(pattern: string, handler: EventHandler): void {
    this.subscriptions.push({ pattern, handler });
  }

  /**
 * Remove a previously registered handler.
 * Both the pattern and the exact handler reference must match.
 *
 * @param pattern - The pattern the handler was registered with
 * @param handler - The exact handler function reference to remove
 */
  unsubscribe(pattern: string, handler: EventHandler): void {
    this.subscriptions = this.subscriptions.filter(
      (s) => !(s.pattern === pattern && s.handler === handler),
    );
  }

  /**
 * Emit an event to all matching subscribers.
 * Handlers are invoked in registration order.
 * Errors from individual handlers are caught and logged so they
   * do not prevent other handlers from executing.
 *
 * @param event - The fully-formed event envelope to dispatch
 * @returns Array of results (or errors) from each handler
 */
  async emit(event: EventEnvelope): Promise<void[]> {
    const matching = this.subscriptions.filter((s) =>
      matchPattern(s.pattern, event.eventType),
    );

    const results = await Promise.allSettled(
      matching.map((s) => s.handler(event)),
    );

    // Log any rejections but do not throw — resilience over strictness.
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error(
          `[EventBus] Handler error for ${event.eventType}:`,
          r.reason,
        );
      }
    }

    return results.map((r) =>
      r.status === 'fulfilled' ? r.value : undefined,
    );
  }

  /**
 * Return the number of active subscriptions (useful for testing / diagnostics).
 */
  get subscriberCount(): number {
    return this.subscriptions.length;
  }

  /**
 * Remove all subscriptions. Primarily useful in tests.
 */
  clear(): void {
    this.subscriptions = [];
  }

  /**
 * Return a list of registered patterns (without handlers).
 */
  getPatterns(): string[] {
    return [...new Set(this.subscriptions.map((s) => s.pattern))];
  }
}

/** Singleton event bus instance */
export const eventBus = new EventBus();

export { EventBus, matchPattern };
