'use client'

import { useDomain } from '@/providers/domain-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Blocks, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function DomainSwitcher() {
  const { domains, activeDomain, setActiveDomain, isLoading } = useDomain()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Blocks className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    )
  }

  if (domains.length === 0) {
    return null
  }

  if (domains.length <= 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <Blocks className="h-4 w-4" />
        <span>{activeDomain?.domain.name ?? 'No Domain'}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 pl-2 pr-3 h-8 font-medium">
          <Blocks className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{activeDomain?.domain.name ?? 'Select Domain'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Domains</div>
        {domains.map((d) => (
          <DropdownMenuItem
            key={d.id}
            onClick={() => setActiveDomain(d.id)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              d.id === activeDomain?.id && 'bg-accent'
            )}
          >
            <Blocks className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{d.domain.name}</span>
            {d.id === activeDomain?.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
