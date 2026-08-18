'use client'
import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOrganization } from './organization-provider'

export interface Domain {
  id: string
  domainId: string
  domain: { id: string; name: string; slug: string; version: string; description: string | null; status: string }
  status: string
  activatedAt: string | null
}

interface DomainContextType {
  domains: Domain[]
  activeDomain: Domain | null
  setActiveDomain: (id: string) => void
  isLoading: boolean
}

const DomainContext = createContext<DomainContextType | null>(null)

export function useDomain() {
  const ctx = useContext(DomainContext)
  if (!ctx) throw new Error('useDomain must be used within DomainProvider')
  return ctx
}

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const { activeOrganization } = useOrganization()
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null)

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ['domains', activeOrganization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/organization-domains?organizationId=${activeOrganization!.id}`)
      const json = await res.json()
      // API returns { data: [...], meta: {...} }
      return Array.isArray(json) ? json : (json.data ?? [])
    },
    enabled: !!activeOrganization,
  })

  // Derive active domain: use explicit selection if set, otherwise first in list
  const activeDomain = useMemo(() => {
    if (activeDomainId) return domains.find(d => d.id === activeDomainId) ?? null
    return domains[0] ?? null
  }, [domains, activeDomainId])

  const setActiveDomain = useCallback((id: string) => {
    setActiveDomainId(id)
  }, [])

  return (
    <DomainContext.Provider value={{ domains, activeDomain, setActiveDomain, isLoading }}>
      {children}
    </DomainContext.Provider>
  )
}
