/**
 * @module core/integration/webhooks
 * Webhook management and delivery system.
 * Webhooks are subscribed to event types (with wildcard support) and
 * deliver event payloads via HTTP POST with HMAC-SHA256 signatures.
 */

async function getRandomBytes(length: number): Promise<Uint8Array> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}
import { db } from '@/lib/db';
import type { CreateWebhookData, UpdateWebhookData, WebhookPayload } from './types';
import { subscribe } from '@/core/automation/events';
import type { EventEnvelope } from '@/core/automation';

// ── Webhook Signature ─────────────────────────────────────────

/** Generate a random webhook signing secret */
export async function generateWebhookSecret(): Promise<string> {
  const bytes = await getRandomBytes(24);
  return 'whsec_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create an HMAC-SHA256 signature for a webhook payload.
 *
 * @param payload - The JSON-stringified payload
 * @param secret - The webhook's signing secret
 * @returns The hex-encoded signature
 */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
}

// ── Event Type Matching ───────────────────────────────────────

/** Test if a concrete event type matches any pattern in the webhook's subscribed list */
function matchesEventTypes(eventType: string, subscribedTypes: string[]): boolean {
  for (const pattern of subscribedTypes) {
    if (pattern === '*' || pattern === eventType) return true;
    if (pattern.endsWith('.*') && eventType.startsWith(pattern.slice(0, -2))) return true;
    if (pattern.startsWith('*.') && eventType.endsWith(pattern.slice(1))) return true;
  }
  return false;
}

// ── CRUD ──────────────────────────────────────────────────────

/**
 * Create a new webhook endpoint.
 *
 * @param data - Webhook creation payload
 * @returns The created webhook (with secret shown only on creation)
 */
export async function createWebhook(data: CreateWebhookData) {
  const secret = data.secret ?? generateWebhookSecret();

  const webhook = await db.webhook.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      url: data.url,
      secret: crypto.randomUUID().toString(),
      eventTypes: JSON.stringify(data.eventTypes),
      status: 'active',
    },
  });

  return {
    ...webhook,
    eventTypes: JSON.parse(webhook.eventTypes) as string[],
    secret, // only returned on creation
  };
}

/**
 * List webhooks for an organization (secret is never returned).
 */
export async function listWebhooks(organizationId: string) {
  const webhooks = await db.webhook.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return webhooks.map((w) => ({
    ...w,
    eventTypes: JSON.parse(w.eventTypes) as string[],
    secret: undefined,
  }));
}

/**
 * Get a single webhook by ID.
 */
export async function getWebhook(id: string, organizationId: string) {
  const webhook = await db.webhook.findUnique({
    where: { id, organizationId },
  });
  if (!webhook) return null;

  return {
    ...webhook,
    eventTypes: JSON.parse(webhook.eventTypes) as string[],
    secret: undefined,
  };
}

/**
 * Update a webhook's configuration.
 */
export async function updateWebhook(
  id: string,
  organizationId: string,
  data: UpdateWebhookData,
) {
  const existing = await db.webhook.findUnique({ where: { id, organizationId } });
  if (!existing) throw new Error(`Webhook ${id} not found`);

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.eventTypes !== undefined) updateData.eventTypes = JSON.stringify(data.eventTypes);
  if (data.secret !== undefined) updateData.secret = data.secret;
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await db.webhook.update({ where: { id }, data: updateData });

  return {
    ...updated,
    eventTypes: JSON.parse(updated.eventTypes) as string[],
    secret: undefined,
  };
}

/**
 * Delete (hard delete) a webhook.
 */
export async function deleteWebhook(id: string, organizationId: string) {
  const existing = await db.webhook.findUnique({ where: { id, organizationId } });
  if (!existing) throw new Error(`Webhook ${id} not found`);

  await db.webhook.delete({ where: { id } });
  return { deleted: true };
}

// ── Delivery ──────────────────────────────────────────────────

/**
 * Deliver an event to a single webhook endpoint.
 * Creates a WebhookDelivery record and sends the HTTP POST.
 */
async function deliverToWebhook(
  webhook: { id: string; url: string; secret: string; organizationId: string },
  event: EventEnvelope,
): Promise<void> {
  const payload: WebhookPayload = {
    id: event.id,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    organizationId: event.organizationId,
    timestamp: event.createdAt.toISOString(),
    data: event.payload,
  };

  const payloadStr = JSON.stringify(payload);
  const signature = signPayload(payloadStr, webhook.secret);

  const delivery = await db.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      organizationId: webhook.organizationId,
      eventId: event.id,
      eventType: event.eventType,
      payload: payloadStr,
      status: 'pending',
    },
  });

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-ID': delivery.id,
        'X-Event-ID': event.id,
        'X-Event-Type': event.eventType,
        'User-Agent': 'Mianx.ai-Webhooks/1.0',
      },
      body: payloadStr,
      signal: AbortSignal.timeout(30_000),
    });

    const responseBody = await response.text().catch(() => '');

    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? 'success' : 'failed',
        statusCode: response.status,
        response: responseBody.length > 4096 ? responseBody.slice(0, 4096) : responseBody,
        deliveredAt: new Date(),
      },
    });

    // Update webhook lastDeliveryAt
    await db.webhook.update({
      where: { id: webhook.id },
      data: { lastDeliveryAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: 'failed', response: message.slice(0, 1024) },
    });
  }
}

/**
 * Internal event handler that routes events to matching webhooks.
 * Registered once at module load via initWebhookBridge.
 */
async function handleEventForWebhooks(event: EventEnvelope): Promise<void> {
  const webhooks = await db.webhook.findMany({
    where: { organizationId: event.organizationId, status: 'active' },
  });

  for (const webhook of webhooks) {
    let eventTypes: string[];
    try {
      eventTypes = JSON.parse(webhook.eventTypes);
    } catch { continue; }

    if (!matchesEventTypes(event.eventType, eventTypes)) continue;

    // Deliver asynchronously, don't block other handlers
    deliverToWebhook(webhook, event).catch((err) => {
      console.error(`[webhooks] Delivery failed for ${webhook.id}:`, err);
    });
  }
}

/**
 * Initialize the webhook event bridge.
 * Subscribes to all events and routes them to matching webhooks.
 * Call once at app startup.
 */
export function initWebhookBridge(): void {
  subscribe('*', handleEventForWebhooks);
  console.log('[webhooks] Bridge initialized — events will be delivered to matching webhooks');
}

// ── Delivery History ──────────────────────────────────────────

/**
 * List webhook delivery attempts.
 */
export async function listWebhookDeliveries(
  organizationId: string,
  webhookId?: string,
  page: number = 1,
  pageSize: number = 20,
) {
  const where: Record<string, unknown> = { organizationId };
  if (webhookId) where.webhookId = webhookId;

  const skip = (page - 1) * pageSize;

  const [deliveries, total] = await Promise.all([
    db.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    db.webhookDelivery.count({ where }),
  ]);

  return {
    data: deliveries.map((d) => ({
      ...d,
      payload: undefined, // don't echo back payload in list views
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Send a test ping event to a webhook.
 */
export async function testWebhook(id: string, organizationId: string) {
  const webhook = await db.webhook.findUnique({ where: { id, organizationId } });
  if (!webhook) throw new Error('Webhook not found');

  const testEvent: EventEnvelope = {
    id: 'test-ping-' + Date.now(),
    eventType: 'webhook.test.ping',
    eventVersion: '1',
    organizationId,
    payload: { webhookId: id, message: 'Test ping from Mianx.ai', timestamp: new Date().toISOString() },
    status: 'pending',
    sourceType: 'system',
    actorType: 'system',
    createdAt: new Date(),
  };

  await deliverToWebhook(webhook, testEvent);

  // Return the latest delivery for this webhook
  const delivery = await db.webhookDelivery.findFirst({
    where: { webhookId: id, organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    webhookId: id,
    deliveryId: delivery?.id,
    status: delivery?.status,
    statusCode: delivery?.statusCode,
  };
}
