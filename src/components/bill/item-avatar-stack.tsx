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
    <div className="flex items-center -space-x-2 rtl:space-x-reverse">
      {visible.map((diner) => (
        <DinerAvatar
          key={diner.id}
          diner={diner}
          defaultPosition={positions[diner.id]}
          className="size-6 border-2 border-card text-xs"
        />
      ))}
      {overflow > 0 && (
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}
