import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { colorTokenForIndex } from './palette'
import { getDinerRemovalImpact } from './selectors'
import type { Bill, Diner, Item } from './types'
import type { TipConfig } from '@/lib/money'
import { generateId } from '@/lib/id'

function nextSortIndex(items: Item[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortIndex), -1) + 1
}

/** Falls back to a no-op if this module is ever evaluated outside a browser (e.g. SSR). */
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

function getBrowserStorage() {
  return typeof window !== 'undefined' ? window.localStorage : noopStorage
}

function touch(): Pick<Bill, 'updatedAt'> {
  return { updatedAt: Date.now() }
}

export interface BillStore {
  bill: Bill | null

  startNewBill: () => void
  discardBill: () => void
  markBillCompleted: () => void
  loadBill: (bill: Bill) => void

  setRestaurantName: (name: string) => void
  setRoundUpPayments: (enabled: boolean) => void

  addDiner: (options?: { includeInExistingItems?: boolean }) => string
  renameDiner: (dinerId: string, name: string) => void
  setDinerPartySize: (dinerId: string, partySize: number) => void
  removeDiner: (dinerId: string, reassignments?: Record<string, string[]>) => void

  addItem: (input: {
    name: string
    unitPriceMinorUnits: number
    quantity?: number
    source?: Item['source']
  }) => string
  updateItem: (
    itemId: string,
    patch: Partial<Pick<Item, 'name' | 'unitPriceMinorUnits' | 'quantity'>>
  ) => void
  removeItem: (itemId: string) => void
  clearItems: () => void
  setItemDiners: (itemId: string, dinerIds: string[]) => void

  setTip: (tip: TipConfig) => void
}

export const useBillStore = create<BillStore>()(
  persist(
    (set, get) => ({
      bill: null,

      startNewBill: () => {
        const now = Date.now()
        // A fresh bill starts with 2 paying parties already in place, matching the most
        // common real-life scenario and reducing first-tap friction — explicit here rather
        // than backfilled by a mount effect, so behavior is identical in every environment.
        const startingDinerCount = 2
        const diners: Diner[] = Array.from({ length: startingDinerCount }, (_, index) => ({
          id: generateId(),
          partySize: 1,
          color: colorTokenForIndex(index),
        }))

        set({
          bill: {
            id: generateId(),
            createdAt: now,
            updatedAt: now,
            currency: 'ILS',
            roundUpPayments: false,
            nextDinerColorIndex: startingDinerCount,
            diners,
            items: [],
            tip: { mode: 'percentage', valueBasisPoints: 0 },
            status: 'draft',
          },
        })
      },

      discardBill: () => set({ bill: null }),

      // Pure local mutation, called only after a successful POST /api/bills/:id/complete — the
      // store itself never talks to the network (see src/lib/bills/ for the orchestration that
      // calls this). No-op if there's no active bill, matching every other action's guard style.
      markBillCompleted: () => {
        const bill = get().bill
        if (!bill) return
        set({ bill: { ...bill, status: 'completed', ...touch() } })
      },

      // Replaces the store wholesale — used when the user taps "Continue current bill" on a
      // cloud-pulled draft that was held in transient React state until this exact moment.
      loadBill: (bill) => set({ bill }),

      setRestaurantName: (name) => {
        const bill = get().bill
        if (!bill) return
        const trimmed = name.trim()
        set({ bill: { ...bill, restaurantName: trimmed.length > 0 ? trimmed : undefined, ...touch() } })
      },

      setRoundUpPayments: (enabled) => {
        const bill = get().bill
        if (!bill) return
        set({ bill: { ...bill, roundUpPayments: enabled, ...touch() } })
      },

      addDiner: (options = {}) => {
        const bill = get().bill
        if (!bill) throw new Error('Cannot add a diner: no active bill')

        const includeInExistingItems = options.includeInExistingItems ?? true
        const id = generateId()
        const diner: Diner = {
          id,
          partySize: 1,
          color: colorTokenForIndex(bill.nextDinerColorIndex),
        }

        set({
          bill: {
            ...bill,
            nextDinerColorIndex: bill.nextDinerColorIndex + 1,
            diners: [...bill.diners, diner],
            items: includeInExistingItems
              ? bill.items.map((item) => ({ ...item, sharedBy: [...item.sharedBy, id] }))
              : bill.items,
            ...touch(),
          },
        })

        return id
      },

      renameDiner: (dinerId, name) => {
        const bill = get().bill
        if (!bill) return
        const trimmed = name.trim()
        set({
          bill: {
            ...bill,
            diners: bill.diners.map((diner) =>
              diner.id === dinerId ? { ...diner, name: trimmed.length > 0 ? trimmed : undefined } : diner
            ),
            ...touch(),
          },
        })
      },

      setDinerPartySize: (dinerId, partySize) => {
        const bill = get().bill
        if (!bill) return
        const safeSize = Math.max(1, Math.round(partySize))
        set({
          bill: {
            ...bill,
            diners: bill.diners.map((diner) =>
              diner.id === dinerId ? { ...diner, partySize: safeSize } : diner
            ),
            ...touch(),
          },
        })
      },

      removeDiner: (dinerId, reassignments = {}) => {
        const bill = get().bill
        if (!bill) return

        if (bill.diners.length <= 1) {
          throw new Error('Cannot remove the only diner on a bill — at least one is required')
        }

        const impact = getDinerRemovalImpact(bill, dinerId)
        for (const itemId of impact.orphanedItemIds) {
          if (!reassignments[itemId]?.length) {
            throw new Error(
              `Cannot remove diner: item ${itemId} would be left with no assigned diners`
            )
          }
        }

        set({
          bill: {
            ...bill,
            diners: bill.diners.filter((diner) => diner.id !== dinerId),
            items: bill.items.map((item) => {
              const reassignment = reassignments[item.id]
              if (reassignment) {
                return { ...item, sharedBy: reassignment }
              }
              if (item.sharedBy.includes(dinerId)) {
                return { ...item, sharedBy: item.sharedBy.filter((id) => id !== dinerId) }
              }
              return item
            }),
            ...touch(),
          },
        })
      },

      addItem: ({ name, unitPriceMinorUnits, quantity = 1, source = 'manual' }) => {
        const bill = get().bill
        if (!bill) throw new Error('Cannot add an item: no active bill')

        const id = generateId()
        const item: Item = {
          id,
          name,
          unitPriceMinorUnits,
          quantity: Math.max(1, Math.round(quantity)),
          sharedBy: bill.diners.map((diner) => diner.id),
          source,
          sortIndex: nextSortIndex(bill.items),
        }

        set({ bill: { ...bill, items: [...bill.items, item], ...touch() } })
        return id
      },

      updateItem: (itemId, patch) => {
        const bill = get().bill
        if (!bill) return
        set({
          bill: {
            ...bill,
            items: bill.items.map((item) => {
              if (item.id !== itemId) return item
              const quantity =
                patch.quantity !== undefined ? Math.max(1, Math.round(patch.quantity)) : item.quantity
              return { ...item, ...patch, quantity }
            }),
            ...touch(),
          },
        })
      },

      removeItem: (itemId) => {
        const bill = get().bill
        if (!bill) return
        set({ bill: { ...bill, items: bill.items.filter((item) => item.id !== itemId), ...touch() } })
      },

      clearItems: () => {
        const bill = get().bill
        if (!bill) return
        set({ bill: { ...bill, items: [], ...touch() } })
      },

      setItemDiners: (itemId, dinerIds) => {
        if (dinerIds.length === 0) {
          throw new Error('An item must always have at least one assigned diner')
        }
        const bill = get().bill
        if (!bill) return
        set({
          bill: {
            ...bill,
            items: bill.items.map((item) => (item.id === itemId ? { ...item, sharedBy: dinerIds } : item)),
            ...touch(),
          },
        })
      },

      setTip: (tip) => {
        const bill = get().bill
        if (!bill) return
        set({ bill: { ...bill, tip, ...touch() } })
      },
    }),
    {
      name: 'check-please-bill',
      storage: createJSONStorage(getBrowserStorage),
      skipHydration: true,
      // v1 added Bill.status ('draft' | 'completed', see Cross-device sync and bill history in
      // CLAUDE.md). A bill persisted before that field existed reads back with `status`
      // undefined — without backfilling it here, every status-gated check downstream (the
      // debounced push-sync guard, the restart sheet's completed-vs-draft branch, "Confirm
      // Payment"'s visibility check) would silently treat a real, editable, pre-existing draft as
      // neither a draft nor completed and skip it entirely.
      version: 1,
      migrate: (persistedState, version) => {
        const state = persistedState as { bill: Bill | null } | undefined
        if (version < 1 && state?.bill && !state.bill.status) {
          return { ...state, bill: { ...state.bill, status: 'draft' } }
        }
        return state as { bill: Bill | null }
      },
    }
  )
)
