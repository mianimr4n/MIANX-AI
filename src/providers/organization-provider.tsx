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

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  const { data: orgs = [], isLoading } = useQuery<Org[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await fetch('/api/organizations')
      const json = await res.json()
      // API returns { data: [...], meta: {...} }
      return Array.isArray(json) ? json : (json.data ?? [])
    },
  })

  // Derive active org: use explicit selection if set, otherwise first in list
  const activeOrganization = useMemo(() => {
    if (activeOrgId) return orgs.find(o => o.id === activeOrgId) ?? null
    return orgs[0] ?? null
  }, [orgs, activeOrgId])

  const { data: permissions = [] } = useQuery<string[]>({
    queryKey: ['permissions', activeOrganization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/permissions?organizationId=${activeOrganization!.id}`)
      const json = await res.json()
      // API returns { data: [...], meta: {...} }
      if (Array.isArray(json)) return json
      // Permissions data is array of permission key strings
      const perms = json.data ?? []
      return perms.map((p: string | { key: string }) => typeof p === 'string' ? p : p.key)
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
