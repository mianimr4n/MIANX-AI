'use client'

import { useOrganization } from '@/providers/organization-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function OrganizationSwitcher() {
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization()

  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <Building2 className="h-4 w-4" />
        <span>{activeOrganization?.name ?? 'No Organization'}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 pl-2 pr-3 h-8 font-medium">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{activeOrganization?.name ?? 'Select Org'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Organizations</div>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setActiveOrganization(org.id)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              org.id === activeOrganization?.id && 'bg-accent'
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrganization?.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
