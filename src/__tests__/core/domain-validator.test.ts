// ══════════════════════════════════════════════════════
// MIANX.AI — Domain Validator Tests
// Critical tests for manifest validation (domain engine security)
// ══════════════════════════════════════════════════════

import { describe, test, expect } from 'bun:test'
import {
  validateDomainManifest,
  validateModuleManifest,
  parseManifest,
} from '@/core/domain/validator'

const validDomain = {
  schema: 'mianx-domain/v1',
  domain: {
    name: 'Test Domain',
    slug: 'test-domain',
    version: '1.0.0',
    description: 'A test domain',
  },
  modules: [
    {
      slug: 'core',
      name: 'Core Module',
      version: '1.0.0',
      permissions: [
        { key: 'test.core.view', description: 'View core data' },
      ],
    },
  ],
  permissions: [
    { key: 'test.admin.manage', description: 'Manage the domain' },
  ],
}

// ── Valid Manifest ─────────────────────────────────────

describe('Domain Validator: Valid Manifest', () => {
  test('accepts a well-formed domain manifest', () => {
    const result = validateDomainManifest(validDomain)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('accepts manifest with zero warnings', () => {
    const result = validateDomainManifest(validDomain)
    expect(result.warnings).toHaveLength(0)
  })
})

// ── Invalid Manifests ──────────────────────────────────

describe('Domain Validator: Rejection', () => {
  test('rejects null', () => {
    const result = validateDomainManifest(null)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Manifest must be a non-null object')
  })

  test('rejects non-object', () => {
    const result = validateDomainManifest('string')
    expect(result.valid).toBe(false)
  })

  test('rejects wrong schema version', () => {
    const result = validateDomainManifest({
      ...validDomain,
      schema: 'wrong-schema',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Unsupported manifest schema'))).toBe(true)
  })

  test('rejects missing domain block', () => {
    const result = validateDomainManifest({
      schema: 'mianx-domain/v1',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('domain'))).toBe(true)
  })

  test('rejects missing domain.name', () => {
    const result = validateDomainManifest({
      ...validDomain,
      domain: { slug: 'test', version: '1.0.0' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('domain.name'))).toBe(true)
  })

  test('rejects missing domain.slug', () => {
    const result = validateDomainManifest({
      ...validDomain,
      domain: { name: 'Test', version: '1.0.0' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('domain.slug'))).toBe(true)
  })

  test('rejects invalid domain.slug format', () => {
    const result = validateDomainManifest({
      ...validDomain,
      domain: { ...validDomain.domain, slug: 'INVALID SLUG!' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('domain.slug'))).toBe(true)
  })

  test('rejects slug starting with number', () => {
    const result = validateDomainManifest({
      ...validDomain,
      domain: { ...validDomain.domain, slug: '123-bad' },
    })
    expect(result.valid).toBe(false)
  })

  test('rejects missing modules array', () => {
    const result = validateDomainManifest({
      schema: 'mianx-domain/v1',
      domain: validDomain.domain,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('modules'))).toBe(true)
  })

  test('warns on empty modules array', () => {
    const result = validateDomainManifest({
      ...validDomain,
      modules: [],
    })
    // Valid but with warning
    expect(result.warnings.some(w => w.includes('zero modules'))).toBe(true)
  })

  test('rejects non-array modules', () => {
    const result = validateDomainManifest({
      ...validDomain,
      modules: 'not-an-array',
    })
    expect(result.valid).toBe(false)
  })

  test('rejects invalid permission key format', () => {
    const result = validateDomainManifest({
      ...validDomain,
      permissions: [{ key: 'INVALID', description: 'bad key' }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('invalid format'))).toBe(true)
  })

  test('rejects permission without description', () => {
    const result = validateDomainManifest({
      ...validDomain,
      permissions: [{ key: 'test.thing.view' }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('description is required'))).toBe(true)
  })
})

// ── Module Validation ───────────────────────────────────

describe('Domain Validator: Module Validation', () => {
  test('rejects duplicate module slugs', () => {
    const result = validateDomainManifest({
      ...validDomain,
      modules: [
        { slug: 'core', name: 'Core', version: '1.0.0' },
        { slug: 'core', name: 'Core Duplicate', version: '1.0.0' },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('duplicate'))).toBe(true)
  })

  test('rejects invalid module slug', () => {
    const slugs = new Set<string>()
    const result = validateModuleManifest(
      { slug: 'BAD SLUG!', name: 'Bad', version: '1.0.0' },
      0,
      slugs
    )
    expect(result.valid).toBe(false)
  })

  test('accepts valid module', () => {
    const slugs = new Set<string>()
    const result = validateModuleManifest(
      { slug: 'valid-module', name: 'Valid', version: '1.0.0' },
      0,
      slugs
    )
    expect(result.valid).toBe(true)
  })

  test('warns on non-semver version', () => {
    const slugs = new Set<string>()
    const result = validateModuleManifest(
      { slug: 'mod', name: 'Mod', version: 'v1' },
      0,
      slugs
    )
    expect(result.warnings.some(w => w.includes('semver'))).toBe(true)
  })

  test('validates module routes', () => {
    const slugs = new Set<string>()
    const result = validateModuleManifest(
      {
        slug: 'mod',
        name: 'Mod',
        version: '1.0.0',
        routes: [
          { method: 'INVALID', path: '/api/test', description: 'bad method' },
        ],
      },
      0,
      slugs
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('method invalid'))).toBe(true)
  })

  test('validates module dependencies', () => {
    const slugs = new Set<string>()
    const result = validateModuleManifest(
      {
        slug: 'mod',
        name: 'Mod',
        version: '1.0.0',
        dependencies: ['valid-slug', '!!!invalid'],
      },
      0,
      slugs
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('invalid slug'))).toBe(true)
  })
})

// ── Parse Manifest ──────────────────────────────────────

describe('parseManifest', () => {
  test('parses valid JSON', () => {
    const { manifest, error } = parseManifest(JSON.stringify(validDomain))
    expect(error).toBeNull()
    expect(manifest).not.toBeNull()
    expect(manifest!.schema).toBe('mianx-domain/v1')
  })

  test('returns error for invalid JSON', () => {
    const { manifest, error } = parseManifest('{not valid json}')
    expect(manifest).toBeNull()
    expect(error).not.toBeNull()
    expect(error).toContain('Invalid JSON')
  })
})
