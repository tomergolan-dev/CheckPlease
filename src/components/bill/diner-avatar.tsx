import { cn } from '@/lib/utils'
import type { Diner } from '@/lib/store/types'
import { DINER_COLOR_CLASSES, initialsFromName } from './diner-display'

interface DinerAvatarProps {
  diner: Diner
  defaultPosition?: number
  className?: string
}

export function DinerAvatar({ diner, defaultPosition, className }: DinerAvatarProps) {
  const glyph = diner.name ? initialsFromName(diner.name) : String(defaultPosition ?? '•')

  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium shadow-sm',
        DINER_COLOR_CLASSES[diner.color],
        className
      )}
      aria-hidden="true"
    >
      {glyph}
    </div>
  )
}
