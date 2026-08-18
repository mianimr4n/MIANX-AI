// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Observability Module
// Entry point for all observability components
// ══════════════════════════════════════════════════════════════════

export { logger, AppEvents } from './logger'
export type { LogLevel, LogContext, ErrorCategory } from './logger'
export { MianxAppError, classifyError, fingerprint, trackError, ErrorCategories, ErrorCodes } from './errors'
export type { ErrorEntry } from './errors'
export { metrics, MetricNames } from './metrics'
export type { CounterMetric, HistogramMetric, GaugeMetric, Metric } from './metrics'
export { recordAIRun, getAICostSummary } from './ai-telemetry'
export type { AIRunContext, AIRunResult } from './ai-telemetry'
export { fireAlert, acknowledgeAlert, resolveAlert, getActiveAlerts, getAlerts, hasP1Active } from './alerts'
export type { Alert, AlertSeverity, AlertStatus, AlertOwner } from './alerts'
export { createIncident, transitionIncident, getIncident, listIncidents, calculateMTTR } from './incidents'
export type { Incident, IncidentStatus, IncidentSeverity, IncidentTimelineEntry } from './incidents'
export { getSLOStatus, getSLOTarget, recordSLOEvent, DEFAULT_SLO_TARGETS } from './slo'
export type { SLOTarget, SLOPeriod } from './slo'
export { redactObject, redactString, redactHeaders, isSensitiveField } from './redact'
