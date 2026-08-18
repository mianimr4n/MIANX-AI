// Domain UI Manifest — typed structure for domain UI registration
// Per spec §36-37, a domain package registers: navigation, dashboards, pages,
// widgets, forms, tables, actions, AI panels, workflows, permissions, feature flags

import React from 'react'

export interface DomainUINavItem {
  title: string
  href: string
  icon?: string // lucide icon name
  permission?: string
  children?: DomainUINavItem[]
}

export interface DomainUIWidget {
  widgetId: string
  title: string
  description?: string
  dataSource: string
  permissions?: string[]
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  refreshPolicy?: 'manual' | 'interval' | 'event'
  refreshIntervalMs?: number
}

export interface DomainUIDashboard {
  id: string
  title: string
  description?: string
  widgets: DomainUIWidget[]
  layout?: 'grid' | 'flex'
}

export interface DomainUIManifest {
  domainSlug: string
  domainName: string
  version: string
  navigation: DomainUINavItem[]
  dashboards: DomainUIDashboard[]
  routes?: { path: string; component: string }[]
  featureFlags?: string[]
}

// In-memory registry of domain UI manifests
const domainManifests = new Map<string, DomainUIManifest>()

export function registerDomainManifest(manifest: DomainUIManifest): void {
  domainManifests.set(manifest.domainSlug, manifest)
}

export function getDomainManifest(slug: string): DomainUIManifest | undefined {
  return domainManifests.get(slug)
}

export function getAllDomainManifests(): DomainUIManifest[] {
  return Array.from(domainManifests.values())
}

// Widget contract per spec §11
export interface WidgetContract {
  widget_id: string
  title: string
  description?: string
  data_source: string
  permissions?: string[]
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  refresh_policy: 'manual' | 'interval' | 'event'
  loading_state: React.ReactNode
  empty_state: React.ReactNode
  error_state: React.ReactNode
}
