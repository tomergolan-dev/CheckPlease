'use client'

import type { Diner } from '@/lib/store/types'
import { DinerAvatar } from './diner-avatar'
import { DINER_VIBRANT_CLASSES } from './diner-display'

interface DinerChipProps {
  diner: Diner
  label: string
  defaultPosition?: number
  onOpen: () => void
}

/** Participant management only — no amount here. See LiveSummarySection's per-person cards
 * for what each diner owes; keeping the two apart is what makes this section read as "who's
 * at the table" rather than a running tab. */
export function DinerChip({ diner, label, defaultPosition, onOpen }: DinerChipProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-2xl py-1 transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="relative inline-flex">
        <DinerAvatar diner={diner} defaultPosition={defaultPosition} size={56} className="ring-2 ring-card" />
        {diner.partySize > 1 && (
          <span
            className={`absolute -end-1 -bottom-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-card ${DINER_VIBRANT_CLASSES[diner.color]}`}
          >
            {diner.partySize}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-xs font-medium">{label}</span>
    </button>
  )
}
