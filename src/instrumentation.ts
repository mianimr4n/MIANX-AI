/**
 * Next.js Instrumentation — runs once at server startup.
 * Initializes cross-cutting concerns like the event-workflow bridge,
 * webhook delivery bridge, and production rate-limit infrastructure.
 */

export async function register() {
  const { verifyRateLimitInfrastructure } = await import('@/lib/rate-limit');
  await verifyRateLimitInfrastructure();

  const { initEventWorkflowBridge } = await import('@/core/automation/event-workflow-bridge');
  initEventWorkflowBridge();

  const { initWebhookBridge } = await import('@/core/integration/webhooks');
  initWebhookBridge();

  const { registerDomainTools } = await import('@/ai/tools');
  const { POULTRY_TOOLS } = await import('@/domains/poultry');
  registerDomainTools(POULTRY_TOOLS);
}
