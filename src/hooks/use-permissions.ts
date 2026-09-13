import { useOrganization } from '@/providers/organization-provider'

export function usePermissions() {
  const { permissions, activeOrganization, permissionsLoading } = useOrganization()

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

  // Permissions have "loaded" once the org is known AND the permissions
  // fetch itself has settled — not just "an org happens to be selected".
  // Previously this was `!!activeOrganization`, which flipped true the
  // instant an org existed even though the actual permissions array was
  // still the default empty [] from before the fetch resolved (or from a
  // swallowed fetch error) — sidebar items gated on hasPermission() would
  // render as if the user had zero access.
  const permissionsLoaded = !!activeOrganization && !permissionsLoading

  return { permissions, hasPermission, hasAnyPermission, activeOrganization, permissionsLoaded }
}