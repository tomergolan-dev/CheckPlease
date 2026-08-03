import type { Diner } from '@/lib/store/types'
import { DinerAvatar } from './diner-avatar'

const MAX_VISIBLE = 4

export function ItemAvatarStack({
  diners,
  positions,
}: {
  diners: Diner[]
  positions: Record<string, number>
}) {
  const visible = diners.slice(0, MAX_VISIBLE)
  const overflow = diners.length - visible.length

  return (
    <div className="flex items-center gap-1">
      {visible.map((diner) => (
        <DinerAvatar
          key={diner.id}
          diner={diner}
          defaultPosition={positions[diner.id]}
          size={20}
        />
      ))}
      {overflow > 0 && (
        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}
