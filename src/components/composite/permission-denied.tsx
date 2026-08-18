import { ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PermissionDeniedProps {
  permission?: string
  className?: string
}

export function PermissionDenied({ permission, className }: PermissionDeniedProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <ShieldX className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-h3 mb-2">Access Denied</h3>
      <p className="text-body text-muted-foreground max-w-md">
        You don't have permission to access this resource.
        {permission && <span className="ml-1 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{permission}</span>}
      </p>
    </div>
  )
}