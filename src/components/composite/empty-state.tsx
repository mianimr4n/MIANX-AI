import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-h3 mb-2">{title}</h3>
      <p className="text-body text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}
