import type { TipConfig } from '@/lib/money'
import type { DinerColorToken } from './palette'

export type CurrencyCode = 'ILS'

export interface Diner {
  id: string
  /** Absent = show the sequential default label ("Diner N"), derived from array position — see selectors.ts. */
  name?: string
  partySize: number
  /** Assigned once at creation from a stable cursor; never recomputed, so a diner's color never changes. */
  color: DinerColorToken
}

export interface Item {
  id: string
  name: string
  unitPriceMinorUnits: number
  quantity: number
  /** Always length >= 1 — enforced by every mutation that can touch this field. */
  sharedBy: string[]
  source: 'manual' | 'scanned'
  /** Stable ordering that survives deletions; not the array index. */
  sortIndex: number
}

export interface Bill {
  id: string
  createdAt: number
  updatedAt: number
  currency: CurrencyCode
  restaurantName?: string
  roundUpPayments: boolean
  /** Internal bookkeeping cursor for stable diner color assignment — not user-facing. */
  nextDinerColorIndex: number
  diners: Diner[]
  items: Item[]
  tip: TipConfig
  /**
   * 'draft' (the active, editable bill) or 'completed' (permanently read-only, saved to "My
   * Bills" via one deliberate action — see Cross-device sync and bill history in CLAUDE.md). This
   * is a display/local-state convenience only — the server's `bills.status`/`completed_at`
   * columns are the sole source of truth for completion state, never this field's synced copy.
   */
  status: 'draft' | 'completed'
}

export interface DinerRemovalImpact {
  /** Items that keep at least one other diner after removal — no action needed. */
  sharedItemIds: string[]
  /** Items that would be left with zero diners — must be resolved before removal proceeds. */
  orphanedItemIds: string[]
}
