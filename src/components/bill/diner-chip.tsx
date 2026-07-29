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
      className="flex items-center gap-2 rounded-full border border-border/60 bg-card py-1 ps-1 pe-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="relative inline-flex">
        <DinerAvatar diner={diner} defaultPosition={defaultPosition} className="ring-2 ring-card" />
        {diner.partySize > 1 && (
          <span className="absolute -end-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-card">
            {diner.partySize}
          </span>
        )}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
