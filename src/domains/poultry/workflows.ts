// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry OS Domain Workflows
// Workflow templates for Poultry OS automation
// ══════════════════════════════════════════════════════════════════

export interface PoultryWorkflowTemplate {
  slug: string
  name: string
  description: string
  triggerType: 'event' | 'schedule'
  triggerConfig: Record<string, unknown>
  steps: PoultryWorkflowStep[]
  permissions: string[]
}

export interface PoultryWorkflowStep {
  id: string
  name: string
  type: 'query' | 'evaluate' | 'notify' | 'update'
  config: Record<string, unknown>
}

// ── Workflow 1: Health Alert on High Mortality ──
// Triggers when a mortality record exceeds threshold
export const POULTRY_HEALTH_ALERT_WORKFLOW: PoultryWorkflowTemplate = {
  slug: 'poultry-health-mortality-alert',
  name: 'Health Alert: High Mortality Detection',
  description: 'When a mortality record is created with count exceeding the configured threshold percentage, alert the farm team and recommend veterinary consultation.',
  triggerType: 'event',
  triggerConfig: {
    eventType: 'poultry.mortality.recorded',
  },
  steps: [
    {
      id: 'fetch-flock',
      name: 'Fetch Flock Context',
      type: 'query',
      config: { action: 'fetch', model: 'PoultryFlock', where: '{ id: event.payload.flockId }' },
    },
    {
      id: 'evaluate-threshold',
      name: 'Evaluate Mortality Threshold',
      type: 'evaluate',
      config: {
        expression: 'event.payload.count / flock.quantity * 100 > config.mortality_threshold_percent',
        onFalse: 'end',
      },
    },
    {
      id: 'create-alert',
      name: 'Create Health Alert Notification',
      type: 'notify',
      config: {
        type: 'alert',
        title: 'High Mortality Alert - {flock.breed}',
        body: '{event.payload.count} birds died in {flock.shed.name}. Cause: {event.payload.cause}. Total mortality rate: {calculatedRate}%. Immediate veterinary review recommended.',
        severity: 'high',
      },
    },
    {
      id: 'log-health-event',
      name: 'Log Health Event',
      type: 'update',
      config: {
        action: 'create',
        model: 'Event',
        data: {
          eventType: 'poultry.health.alert_triggered',
          payload: '{ ...event.payload, flockId: flock.id, mortalityRate: calculatedRate }',
        },
      },
    },
  ],
  permissions: ['poultry.health.view', 'poultry.flock.view'],
}

// ── Workflow 2: Feed Schedule Reminder ──
// Triggers on schedule to remind about feed recording
export const POULTRY_FEED_SCHEDULE_WORKFLOW: PoultryWorkflowTemplate = {
  slug: 'poultry-feed-schedule-reminder',
  name: 'Feed Schedule Reminder',
  description: 'Daily reminder to record feed consumption for all active flocks that have not yet had feed recorded today.',
  triggerType: 'schedule',
  triggerConfig: {
    cron: '0 18 * * *', // 6 PM daily
    timezone: 'Asia/Karachi',
  },
  steps: [
    {
      id: 'find-active-flocks',
      name: 'Find Active Flocks Without Today Feed Record',
      type: 'query',
      config: {
        action: 'query',
        model: 'PoultryFlock',
        where: '{ status: { in: ["placed", "growing", "laying"] } }',
        include: '{ shed: { select: { name: true, farm: { select: { name: true } } } } }',
      },
    },
    {
      id: 'check-feed-recorded',
      name: 'Check If Feed Already Recorded Today',
      type: 'query',
      config: {
        action: 'query',
        model: 'PoultryFeedRecord',
        where: '{ flockId: flock.id, date: { gte: todayStart } }',
        take: 1,
      },
    },
    {
      id: 'send-reminder',
      name: 'Send Feed Recording Reminder',
      type: 'notify',
      config: {
        type: 'reminder',
        title: 'Feed Recording Reminder',
        body: 'Feed consumption has not been recorded today for {flock.shed.name} ({flock.breed}, {flock.currentCount} birds). Please record today\'s feed usage.',
      },
    },
  ],
  permissions: ['poultry.feed.view', 'poultry.flock.view'],
}

// ── Workflow 3: Sales Recording Confirmation ──
// Triggers when a sale is created to confirm and notify
export const POULTRY_SALES_RECORDING_WORKFLOW: PoultryWorkflowTemplate = {
  slug: 'poultry-sales-recording-confirm',
  name: 'Sale Recording Confirmation',
  description: 'When a significant sale is recorded (above threshold amount), create a confirmation notification with revenue summary.',
  triggerType: 'event',
  triggerConfig: {
    eventType: 'poultry.sale.created',
  },
  steps: [
    {
      id: 'evaluate-significance',
      name: 'Evaluate Sale Significance',
      type: 'evaluate',
      config: {
        expression: 'event.payload.totalAmount >= config.significant_sale_threshold',
        defaultValue: 100000, // 100K default threshold
        onFalse: 'end',
      },
    },
    {
      id: 'fetch-customer',
      name: 'Fetch Customer Details',
      type: 'query',
      config: {
        action: 'fetch',
        model: 'PoultryCustomer',
        where: '{ id: event.payload.customerId }',
      },
    },
    {
      id: 'create-confirmation',
      name: 'Create Sale Confirmation',
      type: 'notify',
      config: {
        type: 'confirmation',
        title: 'Significant Sale Recorded',
        body: 'Sale of {event.payload.currency} {event.payload.totalAmount} recorded for {customer.name}. Items: {event.payload.items}.',
      },
    },
    {
      id: 'update-sales-summary',
      name: 'Update Sales Summary Cache',
      type: 'update',
      config: {
        action: 'create',
        model: 'Event',
        data: {
          eventType: 'poultry.sale.significant',
          payload: '{ saleId: event.payload.id, amount: event.payload.totalAmount, customer: customer.name }',
        },
      },
    },
  ],
  permissions: ['poultry.sale.view', 'poultry.sale.create'],
}

/** All Poultry workflow templates */
export const POULTRY_WORKFLOWS: PoultryWorkflowTemplate[] = [
  POULTRY_HEALTH_ALERT_WORKFLOW,
  POULTRY_FEED_SCHEDULE_WORKFLOW,
  POULTRY_SALES_RECORDING_WORKFLOW,
]
