'use client'

import { cn } from '@/lib/utils'
import type { Diner } from '@/lib/store/types'
import { DinerAvatar } from './diner-avatar'

interface DinerToggleChipProps {
  diner: Diner
  label: string
  defaultPosition?: number
  selected: boolean
  disabled?: boolean
  onToggle: () => void
}

export function DinerToggleChip({
  diner,
  label,
  defaultPosition,
  selected,
  disabled,
  onToggle,
}: DinerToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-sm font-medium transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        selected
          ? 'border-primary bg-accent text-accent-foreground shadow-soft'
          : 'border-border/40 bg-background text-muted-foreground hover:border-border hover:text-foreground',
        disabled && 'opacity-50'
      )}
    >
      <DinerAvatar diner={diner} defaultPosition={defaultPosition} size={24} className="ring-2 ring-card" />
      {label}
    </button>
  )
}
