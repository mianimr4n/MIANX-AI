// ══════════════════════════════════════════════════════
// MIANX.AI — Pagination System Tests
// Phase 13: Tests for pagination helpers and safety limits
// ══════════════════════════════════════════════════════

import { describe, test, expect } from 'bun:test'
import {
  parsePagination,
  prismaPagination,
  paginateResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/lib/pagination'

describe('parsePagination', () => {
  test('returns defaults for empty params', () => {
    const params = new URLSearchParams()
    const result = parsePagination(params)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE)
    expect(result.sortBy).toBe('createdAt')
    expect(result.sortOrder).toBe('desc')
  })

  test('parses page and pageSize', () => {
    const params = new URLSearchParams('page=3&pageSize=10')
    const result = parsePagination(params)
    expect(result.page).toBe(3)
    expect(result.pageSize).toBe(10)
  })

  test('clamps pageSize to MAX_PAGE_SIZE', () => {
    const params = new URLSearchParams('pageSize=999999')
    const result = parsePagination(params)
    expect(result.pageSize).toBe(MAX_PAGE_SIZE)
  })

  test('clamps pageSize to minimum of 1', () => {
    const params = new URLSearchParams('pageSize=0')
    const result = parsePagination(params)
    expect(result.pageSize).toBe(1)
  })

  test('clamps negative pageSize to 1', () => {
    const params = new URLSearchParams('pageSize=-5')
    const result = parsePagination(params)
    expect(result.pageSize).toBe(1)
  })

  test('accepts limit as alias for pageSize', () => {
    const params = new URLSearchParams('limit=50')
    const result = parsePagination(params)
    expect(result.pageSize).toBe(50)
  })

  test('pageSize takes priority over limit', () => {
    const params = new URLSearchParams('pageSize=25&limit=50')
    const result = parsePagination(params)
    expect(result.pageSize).toBe(25)
  })

  test('handles NaN gracefully', () => {
    const params = new URLSearchParams('page=abc&pageSize=xyz')
    const result = parsePagination(params)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE)
  })

  test('parses sortBy and sortOrder', () => {
    const params = new URLSearchParams('sortBy=name&sortOrder=asc')
    const result = parsePagination(params)
    expect(result.sortBy).toBe('name')
    expect(result.sortOrder).toBe('asc')
  })

  test('applies overrides', () => {
    const params = new URLSearchParams('page=5')
    const result = parsePagination(params, { pageSize: 10 })
    expect(result.page).toBe(5)
    expect(result.pageSize).toBe(10)
  })
})

describe('prismaPagination', () => {
  test('computes correct skip and take for page 1', () => {
    const pagination = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const result = prismaPagination(pagination)
    expect(result.skip).toBe(0)
    expect(result.take).toBe(20)
  })

  test('computes correct skip for page 3', () => {
    const pagination = { page: 3, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const result = prismaPagination(pagination)
    expect(result.skip).toBe(20)
    expect(result.take).toBe(10)
  })
})

describe('paginateResult', () => {
  test('wraps data with correct pagination metadata', () => {
    const data = [{ id: '1' }, { id: '2' }]
    const pagination = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const result = paginateResult(data, 50, pagination)
    expect(result.data).toEqual(data)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.pageSize).toBe(20)
    expect(result.pagination.total).toBe(50)
    expect(result.pagination.totalPages).toBe(3) // ceil(50/20)
    expect(result.pagination.hasMore).toBe(true)
  })

  test('hasMore is false on last page', () => {
    const data = [{ id: '1' }]
    const pagination = { page: 3, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const result = paginateResult(data, 41, pagination)
    expect(result.pagination.totalPages).toBe(3) // ceil(41/20)
    expect(result.pagination.hasMore).toBe(false) // page 3 of 3
  })

  test('handles empty results', () => {
    const pagination = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const result = paginateResult([], 0, pagination)
    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
    expect(result.pagination.hasMore).toBe(false)
  })

  test('handles exact page fill', () => {
    const data = new Array(20).fill(null).map((_, i) => ({ id: String(i) }))
    const pagination = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
    const result = paginateResult(data, 20, pagination)
    expect(result.pagination.hasMore).toBe(false)
  })
})
