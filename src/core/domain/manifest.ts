// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Domain & Module Manifest Types
// Manifest-based plugin architecture for domains and modules
// ══════════════════════════════════════════════════════════════════

/** Permission defined by a domain or module */
export interface ManifestPermission {
  key: string
  description: string
  /** Default roles that get this permission on activation */
  defaultRoles?: string[]
}

/** A configuration field exposed by a domain/module */
export interface ManifestConfigField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'select'
  defaultValue?: unknown
  options?: string[]
  required?: boolean
  description?: string
}

/** A module within a domain */
export interface ModuleManifest {
  slug: string
  name: string
  version: string
  description?: string
  /** Permissions this module requires */
  permissions?: ManifestPermission[]
  /** Configuration fields */
  configFields?: ManifestConfigField[]
  /** Slugs of modules this depends on (must be activated first) */
  dependencies?: string[]
  /** API routes this module registers */
  routes?: { method: string; path: string; description: string }[]
  /** Whether this module is the domain's entry point */
  isEntry?: boolean
}

/** The root domain manifest */
export interface DomainManifest {
  schema: 'mianx-domain/v1'
  domain: {
    name: string
    slug: string
    version: string
    description?: string
    icon?: string
    category?: string
  }
  modules: ModuleManifest[]
  /** Global permissions for this domain */
  permissions?: ManifestPermission[]
  /** Global configuration fields for the domain */
  configFields?: ManifestConfigField[]
}

/** Validation result */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/** Minimal manifest info stored in DB */
export interface StoredManifest {
  schema: string
  domain: { name: string; slug: string; version: string; description?: string }
  moduleCount: number
  permissionCount: number
}
