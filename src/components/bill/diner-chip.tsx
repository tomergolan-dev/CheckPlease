'use client'

import type { Diner } from '@/lib/store/types'
import { DinerAvatar } from './diner-avatar'

interface DinerChipProps {
  diner: Diner
  label: string
  defaultPosition?: number
  onOpen: () => void
}

export function DinerChip({ diner, label, defaultPosition, onOpen }: DinerChipProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-2 rounded-full border border-border bg-card py-1 ps-1 pe-3 shadow-soft transition-transform active:scale-95"
    >
      <span className="relative inline-flex">
        <DinerAvatar diner={diner} defaultPosition={defaultPosition} />
        {diner.partySize > 1 && (
          <span className="absolute -end-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
            {diner.partySize}
          </span>
        )}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
