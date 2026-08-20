// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Domain Registry Service
// Business logic for domain/module activation, deactivation, queries
// ══════════════════════════════════════════════════════════════════

import { db } from '@/lib/db'
import { validateDomainManifest, extractStoredManifest } from './validator'
import type { DomainManifest } from './manifest'
import { slugify } from '@/core/tenancy/utils'

export interface CreateDomainInput {
  name: string
  slug?: string
  version: string
  description?: string
  manifest?: DomainManifest
  status?: 'draft' | 'available'
}

export interface CreateModuleInput {
  domainId: string
  name: string
  slug?: string
  version: string
  description?: string
  manifest?: string
  status?: 'draft' | 'available'
}

export interface ActivateDomainInput {
  organizationId: string
  domainId: string
  configuration?: Record<string, unknown>
}

export interface ActivateModuleInput {
  organizationId: string
  moduleId: string
  configuration?: Record<string, unknown>
}

/**
 * Create a new global domain.
 * If a manifest is provided, it will be validated and stored.
 */
export async function createDomain(input: CreateDomainInput) {
  let manifestJson: string | null = null
  const warnings: string[] = []

  if (input.manifest) {
    const validation = validateDomainManifest(input.manifest)
    if (!validation.valid) {
      return { ok: false as const, error: `Invalid manifest: ${validation.errors.join('; ')}` }
    }
    warnings.push(...validation.warnings)
    manifestJson = extractStoredManifest(input.manifest)
  }

  const slug = input.slug || slugify(input.name)

  // Check uniqueness
  const existing = await db.domain.findUnique({ where: { slug } })
  if (existing) {
    return { ok: false as const, error: `Domain with slug '${slug}' already exists` }
  }

  const domain = await db.domain.create({
    data: {
      name: input.name,
      slug,
      version: input.version,
      description: input.description,
      status: input.status || 'draft',
      manifest: manifestJson,
    },
  })

  return { ok: true as const, data: domain, warnings }
}

/** Get all global domains (no tenant scope — these are platform-level) */
export async function listDomains(opts?: { status?: string; includeModules?: boolean }) {
  return db.domain.findMany({
    where: opts?.status ? { status: opts.status as never } : undefined,
    include: {
      ...(opts?.includeModules ? {
        modules: { orderBy: { slug: 'asc' }, include: { _count: { select: { orgModules: true } } } },
      } : {}),
      _count: { select: { organizationDomains: true, modules: true } },
    },
    orderBy: { name: 'asc' },
  })
}

/** Get a single domain by ID */
export async function getDomain(id: string, opts?: { includeModules?: boolean }) {
  return db.domain.findUnique({
    where: { id },
    include: {
      ...(opts?.includeModules ? {
        modules: { orderBy: { slug: 'asc' }, include: { _count: { select: { orgModules: true } } } },
      } : {}),
      _count: { select: { organizationDomains: true, modules: true } },
    },
  })
}

/** Update a domain */
export async function updateDomain(id: string, data: { name?: string; description?: string; version?: string; status?: 'draft' | 'available' | 'deprecated' | 'archived'; manifest?: DomainManifest }) {
  // If manifest update, validate it
  if (data.manifest) {
    const validation = validateDomainManifest(data.manifest)
    if (!validation.valid) {
      return { ok: false as const, error: `Invalid manifest: ${validation.errors.join('; ')}` }
    }
    const { manifest: rawManifest, ...rest } = data
    const updated = await db.domain.update({
      where: { id },
      data: { ...rest, manifest: extractStoredManifest(rawManifest) } as Record<string, unknown>,
    })
    return { ok: true as const, data: updated }
  }

  const { manifest: _, ...updateData } = data
  const updated = await db.domain.update({ where: { id }, data: updateData as Record<string, unknown> })
  return { ok: true as const, data: updated }
}

/** Deprecate a domain (soft delete) */
export async function deprecateDomain(id: string) {
  const domain = await db.domain.findUnique({ where: { id } })
  if (!domain) return { ok: false as const, error: 'Domain not found' }

  // Check if any org has this active
  const activeCount = await db.organizationDomain.count({
    where: { domainId: id, status: 'active' },
  })
  if (activeCount > 0) {
    return { ok: false as const, error: `Cannot deprecate: ${activeCount} organization(s) have this domain active` }
  }

  const updated = await db.domain.update({
    where: { id },
    data: { status: 'deprecated' },
  })
  return { ok: true as const, data: updated }
}

/**
 * Register a module under a domain.
 */
export async function createModule(input: CreateModuleInput) {
  // Verify domain exists
  const domain = await db.domain.findUnique({ where: { id: input.domainId } })
  if (!domain) {
    return { ok: false as const, error: `Domain '${input.domainId}' not found` }
  }

  const slug = input.slug || slugify(input.name)

  // Check uniqueness within domain
  const existing = await db.module.findUnique({
    where: { domainId_slug: { domainId: input.domainId, slug } },
  })
  if (existing) {
    return { ok: false as const, error: `Module with slug '${slug}' already exists in domain '${domain.slug}'` }
  }

  const createdModule = await db.module.create({
    data: {
      domainId: input.domainId,
      name: input.name,
      slug,
      version: input.version,
      description: input.description,
      status: input.status || 'draft',
      manifest: input.manifest || null,
    },
  })

  return { ok: true as const, data: createdModule }
}

/** List modules for a domain */
export async function listModules(domainId: string) {
  const domain = await db.domain.findUnique({ where: { id: domainId } })
  if (!domain) return null

  return db.module.findMany({
    where: { domainId },
    include: { _count: { select: { orgModules: true } } },
    orderBy: { name: 'asc' },
  })
}

/**
 * Activate a domain for an organization.
 * This creates an OrganizationDomain record.
 */
export async function activateDomain(input: ActivateDomainInput) {
  const { organizationId, domainId, configuration } = input

  // Verify domain exists and is available
  const domain = await db.domain.findUnique({ where: { id: domainId } })
  if (!domain) return { ok: false as const, error: 'Domain not found' }
  if (domain.status !== 'available') {
    return { ok: false as const, error: `Domain is '${domain.status}' — only 'available' domains can be activated` }
  }

  // Check if already activated
  const existing = await db.organizationDomain.findUnique({
    where: { organizationId_domainId: { organizationId, domainId } },
  })
  if (existing) {
    if (existing.status === 'active') {
      return { ok: false as const, error: 'Domain is already active for this organization' }
    }
    // Reactivate
    const reactivated = await db.organizationDomain.update({
      where: { id: existing.id },
      data: { status: 'active', activatedAt: new Date(), configuration: configuration ? JSON.stringify(configuration) : existing.configuration },
    })
    return { ok: true as const, data: reactivated }
  }

  const orgDomain = await db.organizationDomain.create({
    data: {
      organizationId,
      domainId,
      status: 'active',
      activatedAt: new Date(),
      configuration: configuration ? JSON.stringify(configuration) : null,
    },
  })

  return { ok: true as const, data: orgDomain }
}

/** Deactivate a domain for an organization */
export async function deactivateDomain(orgDomainId: string, organizationId: string) {
  const orgDomain = await db.organizationDomain.findUnique({ where: { id: orgDomainId } })
  if (!orgDomain) return { ok: false as const, error: 'Organization domain not found' }
  if (orgDomain.organizationId !== organizationId) {
    return { ok: false as const, error: 'Domain does not belong to this organization' }
  }

  // Also deactivate all modules under this domain for this org
  await db.organizationModule.updateMany({
    where: {
      organizationId,
      module: { domainId: orgDomain.domainId },
      status: 'active',
    },
    data: { status: 'inactive' },
  })

  const updated = await db.organizationDomain.update({
    where: { id: orgDomainId },
    data: { status: 'inactive' },
  })
  return { ok: true as const, data: updated }
}

/**
 * Activate a module for an organization.
 * Requires the parent domain to be active first.
 */
export async function activateModule(input: ActivateModuleInput) {
  const { organizationId, moduleId, configuration } = input

  const fetchedModule = await db.module.findUnique({
    where: { id: moduleId },
    include: { domain: true },
  })
  if (!fetchedModule) return { ok: false as const, error: 'Module not found' }
  if (fetchedModule.status !== 'available') {
    return { ok: false as const, error: `Module is '${fetchedModule.status}' — only 'available' modules can be activated` }
  }

  // Verify domain is active for this org
  const orgDomain = await db.organizationDomain.findUnique({
    where: { organizationId_domainId: { organizationId, domainId: fetchedModule.domainId } },
  })
  if (!orgDomain || orgDomain.status !== 'active') {
    return { ok: false as const, error: `Parent domain '${fetchedModule.domain.name}' must be activated first` }
  }

  // Check existing
  const existing = await db.organizationModule.findUnique({
    where: { organizationId_moduleId: { organizationId, moduleId } },
  })
  if (existing) {
    if (existing.status === 'active') {
      return { ok: false as const, error: 'Module is already active for this organization' }
    }
    const reactivated = await db.organizationModule.update({
      where: { id: existing.id },
      data: { status: 'active', activatedAt: new Date(), configuration: configuration ? JSON.stringify(configuration) : existing.configuration },
    })
    return { ok: true as const, data: reactivated }
  }

  const orgModule = await db.organizationModule.create({
    data: {
      organizationId,
      moduleId,
      status: 'active',
      activatedAt: new Date(),
      configuration: configuration ? JSON.stringify(configuration) : null,
    },
  })

  return { ok: true as const, data: orgModule }
}

/** Deactivate a module for an organization */
export async function deactivateModule(orgModuleId: string, organizationId: string) {
  const orgModule = await db.organizationModule.findUnique({ where: { id: orgModuleId } })
  if (!orgModule) return { ok: false as const, error: 'Organization module not found' }
  if (orgModule.organizationId !== organizationId) {
    return { ok: false as const, error: 'Module does not belong to this organization' }
  }

  const updated = await db.organizationModule.update({
    where: { id: orgModuleId },
    data: { status: 'inactive' },
  })
  return { ok: true as const, data: updated }
}

/** Get organization's active domains with their modules */
export async function getOrganizationDomains(organizationId: string) {
  return db.organizationDomain.findMany({
    where: { organizationId },
    include: {
      domain: { include: { modules: { include: { _count: { select: { orgModules: true } } } } } },
      organization: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Get organization's active modules */
export async function getOrganizationModules(organizationId: string) {
  return db.organizationModule.findMany({
    where: { organizationId },
    include: {
      module: { include: { domain: { select: { id: true, name: true, slug: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
