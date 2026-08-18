/**
 * Next.js Instrumentation — runs once at server startup.
 * Initializes cross-cutting concerns like the event-workflow bridge
 * and the webhook delivery bridge.
 */

export async function register() {
  // Initialize the event→workflow bridge so published events
  // automatically trigger matching active workflows.
  const { initEventWorkflowBridge } = await import('@/core/automation/event-workflow-bridge');
  initEventWorkflowBridge();

  // Initialize the event→webhook bridge so published events
  // are delivered to matching webhook endpoints.
  const { initWebhookBridge } = await import('@/core/integration/webhooks');
  initWebhookBridge();
}
