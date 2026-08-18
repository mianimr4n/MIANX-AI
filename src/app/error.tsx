'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-h2">Something went wrong</h2>
      <p className="text-body text-muted-foreground max-w-md">{error.message || 'An unexpected error occurred.'}</p>
      {error.digest && (
        <p className="text-caption text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset}>Try Again</Button>
    </div>
  )
}
