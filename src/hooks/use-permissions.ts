import { useOrganization } from '@/providers/organization-provider'

export function usePermissions() {
  const { permissions, activeOrganization } = useOrganization()

  const hasPermission = (key: string): boolean => {
    if (!activeOrganization) return false
    if (permissions.length === 0) return false
    // Wildcard match
    if (permissions.includes('*.*')) return true
    if (permissions.includes(key)) return true
    const [domain, resource, action] = key.split('.')
    return permissions.some((p) => {
      if (p === key) return true
      const parts = p.split('.')
      if (parts[0] === '*' && parts[1] === '*' && parts[2] === action) return true
      if (parts[0] === '*' && parts[1] === resource && parts[2] === action) return true
      if (parts[0] === domain && parts[1] === '*' && parts[2] === action) return true
      if (parts[0] === domain && parts[1] === resource && parts[2] === '*') return true
      return false
    })
  }

  const hasAnyPermission = (keys: string[]): boolean => keys.some(hasPermission)

  // Permissions have loaded when an org is selected and the permissions array has been fetched
  // (even if empty, meaning the user has no permissions yet)
  const permissionsLoaded = !!activeOrganization

  return { permissions, hasPermission, hasAnyPermission, activeOrganization, permissionsLoaded }
}