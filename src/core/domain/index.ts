// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Domain Engine Module
// Re-exports for clean imports: import { activateDomain } from '@/core/domain'
// ══════════════════════════════════════════════════════════════════

export type {
  DomainManifest,
  ModuleManifest,
  ManifestPermission,
  ManifestConfigField,
  ValidationResult,
  StoredManifest,
} from './manifest'

export {
  validateDomainManifest,
  validateModuleManifest,
  extractStoredManifest,
  parseManifest,
} from './validator'

export {
  createDomain,
  listDomains,
  getDomain,
  updateDomain,
  deprecateDomain,
  createModule,
  listModules,
  activateDomain,
  deactivateDomain,
  activateModule,
  deactivateModule,
  getOrganizationDomains,
  getOrganizationModules,
} from './registry'

export type {
  CreateDomainInput,
  CreateModuleInput,
  ActivateDomainInput,
  ActivateModuleInput,
} from './registry'
