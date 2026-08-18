// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Manifest Validator
// Validates domain and module manifests against the schema
// ══════════════════════════════════════════════════════════════════

import type { DomainManifest, ModuleManifest, ManifestPermission, ValidationResult } from './manifest'

const PERMISSION_REGEX = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,2}$/
const SLUG_REGEX = /^[a-z][a-z0-9-]*$/
const VERSION_REGEX = /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/
const METHOD_REGEX = /^(GET|POST|PATCH|PUT|DELETE|OPTIONS|HEAD)$/
const PATH_REGEX = /^\/[a-zA-Z0-9_\/{}:-]*$/

/** Validate a full domain manifest */
export function validateDomainManifest(manifest: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null object'], warnings: [] }
  }

  const m = manifest as Record<string, unknown>

  // Schema check
  if (m.schema !== 'mianx-domain/v1') {
    errors.push(`Unsupported manifest schema: expected 'mianx-domain/v1', got '${m.schema ?? 'undefined'}'`)
  }

  // Domain block
  const domain = m.domain as Record<string, unknown> | undefined
  if (!domain || typeof domain !== 'object') {
    errors.push('Missing or invalid ".domain" block')
    return { valid: false, errors, warnings }
  }

  if (!domain.name || typeof domain.name !== 'string')
    errors.push('domain.name is required and must be a string')
  if (!domain.slug || typeof domain.slug !== 'string') {
    errors.push('domain.slug is required and must be a string')
  } else if (!SLUG_REGEX.test(domain.slug)) {
    errors.push(`domain.slug must match ${SLUG_REGEX}: '${domain.slug}'`)
  }
  if (!domain.version || typeof domain.version !== 'string') {
    errors.push('domain.version is required and must be a string')
  } else if (!VERSION_REGEX.test(domain.version)) {
    warnings.push(`domain.version should be semver: '${domain.version}'`)
  }

  // Modules
  const modules = m.modules
  if (!Array.isArray(modules)) {
    errors.push('"modules" must be an array')
  } else if (modules.length === 0) {
    warnings.push('Domain has zero modules — it will have no functionality')
  } else {
    const slugs = new Set<string>()
    for (let i = 0; i < modules.length; i++) {
      const modErrs = validateModuleManifest(modules[i], i, slugs)
      errors.push(...modErrs.errors)
      warnings.push(...modErrs.warnings)
    }
  }

  // Permissions (if any)
  if (m.permissions !== undefined) {
    if (!Array.isArray(m.permissions)) {
      errors.push('"permissions" must be an array')
    } else {
      const permErrs = validatePermissions(m.permissions, 'domain')
      errors.push(...permErrs)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/** Validate a single module manifest entry */
export function validateModuleManifest(
  mod: unknown,
  index: number,
  existingSlugs: Set<string>
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const prefix = `modules[${index}]`

  if (!mod || typeof mod !== 'object') {
    errors.push(`${prefix}: must be a non-null object`)
    return { valid: false, errors, warnings }
  }

  const m = mod as Record<string, unknown>

  if (!m.name || typeof m.name !== 'string')
    errors.push(`${prefix}.name is required`)

  if (!m.slug || typeof m.slug !== 'string') {
    errors.push(`${prefix}.slug is required`)
  } else if (!SLUG_REGEX.test(m.slug)) {
    errors.push(`${prefix}.slug must match ${SLUG_REGEX}: '${m.slug}'`)
  } else if (existingSlugs.has(m.slug)) {
    errors.push(`${prefix}.slug '${m.slug}' is a duplicate within this domain`)
  }
  existingSlugs.add(m.slug as string)

  if (!m.version || typeof m.version !== 'string') {
    errors.push(`${prefix}.version is required`)
  } else if (!VERSION_REGEX.test(m.version)) {
    warnings.push(`${prefix}.version should be semver: '${m.version}'`)
  }

  // Validate permissions
  if (m.permissions !== undefined) {
    if (!Array.isArray(m.permissions)) {
      errors.push(`${prefix}.permissions must be an array`)
    } else {
      const permErrs = validatePermissions(m.permissions, prefix)
      errors.push(...permErrs)
    }
  }

  // Validate dependencies reference other modules in the same domain
  if (m.dependencies !== undefined) {
    if (!Array.isArray(m.dependencies)) {
      errors.push(`${prefix}.dependencies must be an array of slugs`)
    } else {
      for (const dep of m.dependencies) {
        if (typeof dep !== 'string' || !SLUG_REGEX.test(dep)) {
          errors.push(`${prefix}.dependencies: invalid slug '${dep}'`)
        }
      }
    }
  }

  // Validate routes
  if (m.routes !== undefined) {
    if (!Array.isArray(m.routes)) {
      errors.push(`${prefix}.routes must be an array`)
    } else {
      for (let r = 0; r < m.routes.length; r++) {
        const route = m.routes[r] as Record<string, unknown>
        if (route.method && !METHOD_REGEX.test(route.method as string)) {
          errors.push(`${prefix}.routes[${r}].method invalid: '${route.method}'`)
        }
        if (route.path && !PATH_REGEX.test(route.path as string)) {
          errors.push(`${prefix}.routes[${r}].path invalid: '${route.path}'`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** Validate permission keys */
function validatePermissions(perms: unknown[], prefix: string): string[] {
  const errors: string[] = []
  for (let i = 0; i < perms.length; i++) {
    const p = perms[i] as Record<string, unknown>
    if (!p.key || typeof p.key !== 'string') {
      errors.push(`${prefix}.permissions[${i}].key is required`)
    } else if (!PERMISSION_REGEX.test(p.key)) {
      errors.push(`${prefix}.permissions[${i}].key invalid format '${p.key}' (expected: domain.resource.action)`)
    }
    if (!p.description || typeof p.description !== 'string') {
      errors.push(`${prefix}.permissions[${i}].description is required`)
    }
  }
  return errors
}

/** Extract a minimal stored manifest from a full manifest */
export function extractStoredManifest(manifest: DomainManifest): string {
  const stored = {
    schema: manifest.schema,
    domain: {
      name: manifest.domain.name,
      slug: manifest.domain.slug,
      version: manifest.domain.version,
      description: manifest.domain.description,
    },
    moduleCount: manifest.modules.length,
    permissionCount: (manifest.permissions?.length ?? 0) +
      manifest.modules.reduce((sum, m) => sum + (m.permissions?.length ?? 0), 0),
  }
  return JSON.stringify(stored)
}

/** Safely parse a manifest JSON string */
export function parseManifest(json: string): { manifest: DomainManifest | null; error: string | null } {
  try {
    const parsed = JSON.parse(json)
    return { manifest: parsed as DomainManifest, error: null }
  } catch (e) {
    return { manifest: null, error: `Invalid JSON: ${(e as Error).message}` }
  }
}
