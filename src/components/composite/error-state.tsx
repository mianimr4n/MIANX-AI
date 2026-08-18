import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message: string
  requestId?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title = 'Something went wrong', message, requestId, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-h3 mb-2">{title}</h3>
      <p className="text-body text-muted-foreground max-w-md mb-4">{message}</p>
      {requestId && (
        <p className="text-caption text-muted-foreground mb-4">Request ID: {requestId}</p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>Try Again</Button>
      )}
    </div>
  )
}
