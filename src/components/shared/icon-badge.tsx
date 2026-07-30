import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DINER_COLOR_CLASSES } from '@/components/bill/diner-display'
import type { DinerColorToken } from '@/lib/store/palette'

const SIZE_CLASSES = { sm: 'size-6', md: 'size-9', lg: 'size-11' } as const
const ICON_SIZE_CLASSES = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' } as const

/**
 * A small colored circle behind an icon, using the same soft-tint token map as diner avatars —
 * one shared palette for "color as identity" across diners AND section/action icons, rather than
 * a separate one-off color system.
 */
export function IconBadge({
  icon: Icon,
  tone,
  size = 'md',
  className,
  iconClassName,
}: {
  icon: LucideIcon
  tone: DinerColorToken
  size?: keyof typeof SIZE_CLASSES
  className?: string
  iconClassName?: string
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        SIZE_CLASSES[size],
        DINER_COLOR_CLASSES[tone],
        className
      )}
    >
      <Icon className={cn(ICON_SIZE_CLASSES[size], iconClassName)} />
    </span>
  )
}
