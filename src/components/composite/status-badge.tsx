import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusVariant = 'active' | 'inactive' | 'pending' | 'suspended' | 'draft' | 'error' | 'warning'

const variantClasses: Record<StatusVariant, string> = {
  active: 'bg-success/15 text-success border-success/25',
  inactive: 'bg-muted text-muted-foreground border-muted',
  pending: 'bg-info/15 text-info border-info/25',
  suspended: 'bg-destructive/15 text-destructive border-destructive/25',
  draft: 'bg-muted text-muted-foreground border-muted',
  error: 'bg-destructive/15 text-destructive border-destructive/25',
  warning: 'bg-warning/15 text-warning border-warning/25',
}

interface StatusBadgeProps {
  status: StatusVariant
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <Badge variant="outline" className={cn('font-medium', variantClasses[status], className)}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {displayLabel}
    </Badge>
  )
}