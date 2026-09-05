'use client'
import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export interface Org {
  id: string
  name: string
  slug: string
  status: string
  currency: string
  _count: { memberships: number; teams: number; auditLogs: number }
  createdAt: string
  roles?: { name: string; slug: string }[]
  joinedAt?: string
}

interface OrganizationContextType {
  organizations: Org[]
  activeOrganization: Org | null
  setActiveOrganization: (id: string) => void
  permissions: string[]
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider')
  return ctx
}

function normalizeOrganizations(payload: unknown): Org[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [])

  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const item = row as { organization?: unknown }
    const organization = item.organization && typeof item.organization === 'object'
      ? item.organization
      : row
    if (!organization || typeof organization !== 'object') return []
    const org = organization as Org
    if (!org.id || !org.name || !org.slug) return []
    return [{
      ...org,
      roles: Array.isArray((row as { roles?: unknown }).roles)
        ? (row as { roles: { name: string; slug: string }[] }).roles
        : org.roles,
      joinedAt: (row as { joinedAt?: string }).joinedAt ?? org.joinedAt,
    }]
  })
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  const { data: orgs = [], isLoading } = useQuery<Org[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await fetch('/api/organizations')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch organizations')
      return normalizeOrganizations(json)
    },
  })

  const activeOrganization = useMemo(() => {
    if (activeOrgId) return orgs.find(o => o.id === activeOrgId) ?? null
    return orgs[0] ?? null
  }, [orgs, activeOrgId])

  const { data: permissions = [] } = useQuery<string[]>({
    queryKey: ['permissions', activeOrganization?.id],
    queryFn: async () => {
      const res = await fetch('/api/permissions', {
        headers: { 'X-Organization-Id': activeOrganization!.id },
      })
      const json = await res.json()
      if (json.data?.userPermissions) return json.data.userPermissions
      if (Array.isArray(json)) return json
      const perms = json.data ?? []
      if (Array.isArray(perms)) return perms.map((p: string | { key: string }) => typeof p === 'string' ? p : p.key)
      return []
    },
    enabled: !!activeOrganization,
  })

  const setActiveOrganization = useCallback((id: string) => {
    setActiveOrgId(id)
    queryClient.invalidateQueries({ queryKey: ['domain'] })
    queryClient.invalidateQueries({ queryKey: ['permissions'] })
  }, [queryClient])

  return (
    <OrganizationContext.Provider
      value={{ organizations: orgs, activeOrganization, setActiveOrganization, permissions, isLoading }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}
