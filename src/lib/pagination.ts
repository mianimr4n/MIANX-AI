// ══════════════════════════════════════════════════════════════════
// MIANX.AI — Pagination Helpers
// Phase 11: Enforce pagination limits on all list endpoints
// ══════════════════════════════════════════════════════════════════

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * Parse and clamp pagination parameters from a URL's searchParams.
 * Returns safe defaults and never exceeds MAX_PAGE_SIZE.
 */
export function parsePagination(searchParams: URLSearchParams, overrides?: Partial<PaginationParams>): Required<PaginationParams> {
  const rawPage = parseInt(searchParams.get('page') || '', 10)
  const rawSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '', 10)

  const page = (overrides?.page ?? (isNaN(rawPage) ? 1 : rawPage))
  const pageSize = Math.min(
    Math.max(overrides?.pageSize ?? (isNaN(rawSize) ? DEFAULT_PAGE_SIZE : rawSize), 1),
    MAX_PAGE_SIZE
  )

  const sortBy = searchParams.get('sortBy') || overrides?.sortBy || 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') || overrides?.sortOrder || 'desc') as 'asc' | 'desc'

  return { page, pageSize, sortBy, sortOrder }
}

/** Build Prisma skip/take from pagination params */
export function prismaPagination(pagination: Required<PaginationParams>) {
  return {
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  }
}

/** Build a pagination response envelope */
export function paginateResult<T>(data: T[], total: number, pagination: Required<PaginationParams>): PaginationResult<T> {
  const totalPages = Math.ceil(total / pagination.pageSize)
  return {
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
      hasMore: pagination.page < totalPages,
    },
  }
}
