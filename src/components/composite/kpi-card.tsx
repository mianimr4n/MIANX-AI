import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  description?: string
  className?: string
}

export function KPICard({ title, value, icon: Icon, trend, description, className }: KPICardProps) {
  const trendColor = trend ? (trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-destructive' : 'text-muted-foreground') : undefined
  const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-label text-muted-foreground uppercase tracking-wider">{title}</span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex items-end gap-2">
          <span className="text-h2">{value}</span>
          {trend && TrendIcon && (
            <span className={cn('flex items-center text-caption mb-1', trendColor)}>
              <TrendIcon className="h-3 w-3 mr-0.5" />
              {Math.abs(trend.value)}% {trend.label}
            </span>
          )}
        </div>
        {description && <p className="text-body-sm text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
