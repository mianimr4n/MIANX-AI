import { EmptyState } from '@/components/composite/empty-state'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
      />
    </div>
  )
}