// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Poultry OS Domain Manifest
// First production domain: validates multi-domain architecture
// ══════════════════════════════════════════════════════════════════

import type { DomainManifest } from '@/core/domain/manifest'

export const POULTRY_DOMAIN_MANIFEST: DomainManifest = {
  schema: 'mianx-domain/v1',
  domain: {
    name: 'Mianx Poultry OS',
    slug: 'poultry',
    version: '1.0.0',
    description: 'Complete poultry farm management: farms, sheds, flocks, feed, health, production, procurement, and sales.',
    icon: '🐔',
    category: 'agriculture',
  },
  modules: [
    {
      slug: 'farm',
      name: 'Farm Management',
      version: '1.0.0',
      description: 'Manage farm locations, capacity, contact info, and operational status.',
      permissions: [
        { key: 'poultry.farm.view', description: 'View farms' },
        { key: 'poultry.farm.create', description: 'Create farms' },
        { key: 'poultry.farm.update', description: 'Update farm details' },
        { key: 'poultry.farm.delete', description: 'Archive/delete farms' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/farms', description: 'List farms' },
        { method: 'POST', path: '/api/poultry/farms', description: 'Create farm' },
        { method: 'GET', path: '/api/poultry/farms/[id]', description: 'Get farm' },
        { method: 'PATCH', path: '/api/poultry/farms/[id]', description: 'Update farm' },
        { method: 'DELETE', path: '/api/poultry/farms/[id]', description: 'Delete farm' },
      ],
      isEntry: true,
    },
    {
      slug: 'shed',
      name: 'Shed Management',
      version: '1.0.0',
      description: 'Track shed types, capacity, environmental conditions, and occupancy.',
      dependencies: ['farm'],
      permissions: [
        { key: 'poultry.shed.view', description: 'View sheds' },
        { key: 'poultry.shed.create', description: 'Create sheds' },
        { key: 'poultry.shed.update', description: 'Update shed details' },
        { key: 'poultry.shed.delete', description: 'Archive/delete sheds' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/sheds', description: 'List sheds' },
        { method: 'POST', path: '/api/poultry/sheds', description: 'Create shed' },
        { method: 'GET', path: '/api/poultry/sheds/[id]', description: 'Get shed' },
        { method: 'PATCH', path: '/api/poultry/sheds/[id]', description: 'Update shed' },
        { method: 'DELETE', path: '/api/poultry/sheds/[id]', description: 'Delete shed' },
      ],
    },
    {
      slug: 'flock',
      name: 'Flock Management',
      version: '1.0.0',
      description: 'Manage flock lifecycle: placement, growth, mortality, weight tracking.',
      dependencies: ['shed'],
      permissions: [
        { key: 'poultry.flock.view', description: 'View flocks' },
        { key: 'poultry.flock.create', description: 'Create flocks' },
        { key: 'poultry.flock.update', description: 'Update flock details' },
        { key: 'poultry.flock.archive', description: 'Deplete/archive flocks' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/flocks', description: 'List flocks' },
        { method: 'POST', path: '/api/poultry/flocks', description: 'Create flock' },
        { method: 'GET', path: '/api/poultry/flocks/[id]', description: 'Get flock' },
        { method: 'PATCH', path: '/api/poultry/flocks/[id]', description: 'Update flock' },
      ],
    },
    {
      slug: 'feed',
      name: 'Feed Tracking',
      version: '1.0.0',
      description: 'Record feed consumption, conversion ratios, stock levels, and costs.',
      dependencies: ['flock'],
      permissions: [
        { key: 'poultry.feed.view', description: 'View feed records' },
        { key: 'poultry.feed.create', description: 'Create feed records' },
        { key: 'poultry.feed.delete', description: 'Delete feed records' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/feed', description: 'List feed records' },
        { method: 'POST', path: '/api/poultry/feed', description: 'Create feed record' },
        { method: 'DELETE', path: '/api/poultry/feed/[id]', description: 'Delete feed record' },
      ],
    },
    {
      slug: 'health',
      name: 'Health Records',
      version: '1.0.0',
      description: 'Track vaccinations, treatments, mortality causes, and health alerts.',
      dependencies: ['flock'],
      permissions: [
        { key: 'poultry.health.view', description: 'View health records' },
        { key: 'poultry.health.create', description: 'Create health records' },
        { key: 'poultry.health.delete', description: 'Delete health records' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/health', description: 'List health records' },
        { method: 'POST', path: '/api/poultry/health', description: 'Create health record' },
        { method: 'DELETE', path: '/api/poultry/health/[id]', description: 'Delete health record' },
      ],
    },
    {
      slug: 'production',
      name: 'Production Metrics',
      version: '1.0.0',
      description: 'Monitor egg production, body weight, feed conversion, and growth curves.',
      dependencies: ['flock'],
      permissions: [
        { key: 'poultry.production.view', description: 'View production records' },
        { key: 'poultry.production.create', description: 'Create production records' },
        { key: 'poultry.production.delete', description: 'Delete production records' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/production', description: 'List production records' },
        { method: 'POST', path: '/api/poultry/production', description: 'Create production record' },
        { method: 'DELETE', path: '/api/poultry/production/[id]', description: 'Delete production record' },
      ],
    },
    {
      slug: 'procurement',
      name: 'Procurement',
      version: '1.0.0',
      description: 'Manage chick procurement, feed purchases, medicine, and equipment.',
      permissions: [
        { key: 'poultry.procurement.view', description: 'View procurement records' },
        { key: 'poultry.procurement.create', description: 'Create procurement records' },
        { key: 'poultry.procurement.update', description: 'Update procurement records' },
        { key: 'poultry.procurement.delete', description: 'Delete procurement records' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/procurement', description: 'List procurement records' },
        { method: 'POST', path: '/api/poultry/procurement', description: 'Create procurement record' },
        { method: 'PATCH', path: '/api/poultry/procurement/[id]', description: 'Update procurement record' },
        { method: 'DELETE', path: '/api/poultry/procurement/[id]', description: 'Delete procurement record' },
      ],
    },
    {
      slug: 'sales',
      name: 'Sales',
      version: '1.0.0',
      description: 'Record sales transactions, customer management, and revenue tracking.',
      permissions: [
        { key: 'poultry.sale.view', description: 'View sales' },
        { key: 'poultry.sale.create', description: 'Create sales' },
        { key: 'poultry.sale.update', description: 'Update sale records' },
        { key: 'poultry.sale.delete', description: 'Delete sales' },
      ],
      routes: [
        { method: 'GET', path: '/api/poultry/sales', description: 'List sales' },
        { method: 'POST', path: '/api/poultry/sales', description: 'Create sale' },
        { method: 'PATCH', path: '/api/poultry/sales/[id]', description: 'Update sale' },
        { method: 'DELETE', path: '/api/poultry/sales/[id]', description: 'Delete sale' },
        { method: 'GET', path: '/api/poultry/customers', description: 'List customers' },
        { method: 'POST', path: '/api/poultry/customers', description: 'Create customer' },
      ],
    },
  ],
  permissions: [
    { key: 'poultry.dashboard.view', description: 'View Poultry OS dashboard' },
    { key: 'poultry.report.generate', description: 'Generate Poultry reports' },
  ],
  configFields: [
    { key: 'poultry.default_flock_cycle_days', label: 'Default Flock Cycle (days)', type: 'number', defaultValue: 42, description: 'Default cycle length for broiler flocks' },
    { key: 'poultry.weight_unit', label: 'Weight Unit', type: 'select', defaultValue: 'kg', options: ['kg', 'lb'], description: 'Unit for weight measurements' },
    { key: 'poultry.feed_unit', label: 'Feed Unit', type: 'select', defaultValue: 'kg', options: ['kg', 'lb', 'tons'], description: 'Unit for feed quantities' },
    { key: 'poultry.mortality_threshold_percent', label: 'Mortality Alert Threshold (%)', type: 'number', defaultValue: 5, description: 'Alert when daily mortality exceeds this %' },
  ],
}

/** All Poultry permissions (flat list for seed) */
export const POULTRY_PERMISSIONS = POULTRY_DOMAIN_MANIFEST.modules
  .flatMap(m => m.permissions || [])
  .concat(POULTRY_DOMAIN_MANIFEST.permissions || [])
  .map(p => ({ key: p.key, description: p.description }))
