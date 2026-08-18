/**
 * Next.js Instrumentation — runs once at server startup.
 * Initializes cross-cutting concerns like the event-workflow bridge.
 */

export async function register() {
  // Initialize the event→workflow bridge so published events
  // automatically trigger matching active workflows.
  const { initEventWorkflowBridge } = await import('@/core/automation/event-workflow-bridge');
  initEventWorkflowBridge();
}
