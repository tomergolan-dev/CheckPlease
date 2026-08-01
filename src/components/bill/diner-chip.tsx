'use client'

import { formatCurrency, type MinorUnits } from '@/lib/money'
import type { CurrencyCode, Diner } from '@/lib/store/types'
import { DinerAvatar } from './diner-avatar'

interface DinerChipProps {
  diner: Diner
  label: string
  defaultPosition?: number
  amountMinorUnits?: MinorUnits
  currency?: CurrencyCode
  onOpen: () => void
}

export function DinerChip({ diner, label, defaultPosition, amountMinorUnits, currency, onOpen }: DinerChipProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl py-1 transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="relative inline-flex">
        <DinerAvatar diner={diner} defaultPosition={defaultPosition} className="size-14 text-base ring-2 ring-card" />
        {diner.partySize > 1 && (
          <span className="absolute -end-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-card">
            {diner.partySize}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-xs font-medium">{label}</span>
      {amountMinorUnits !== undefined && currency && (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatCurrency(amountMinorUnits, currency)}
        </span>
      )}
    </button>
  )
}
