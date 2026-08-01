import {
  computeBillPayableSummary,
  computeBillSubtotal,
  computeDinerSubtotals,
  computeDinerTipShares,
  computeDinerTotals,
  computeTipTotal,
  type BillPayableSummary,
  type DinerTotal,
} from '@/lib/money'
import type { Bill, Diner, DinerRemovalImpact } from './types'

/**
 * Maps each diner without a custom name to its 1-based position among all diners.
 * Position-based (not a stored index), so removing a diner shifts everyone after it
 * down by one and closes the gap — e.g. Diner 1/2/3 minus Diner 2 becomes Diner 1/2.
 * Renaming a diner never affects anyone else's number, since the array itself doesn't change.
 */
export function getDinerDefaultPositions(diners: Diner[]): Record<string, number> {
  const positions: Record<string, number> = {}
  diners.forEach((diner, index) => {
    if (!diner.name) {
      positions[diner.id] = index + 1
    }
  })
  return positions
}

export function getDinerRemovalImpact(bill: Bill, dinerId: string): DinerRemovalImpact {
  const sharedItemIds: string[] = []
  const orphanedItemIds: string[] = []

  for (const item of bill.items) {
    if (!item.sharedBy.includes(dinerId)) continue
    if (item.sharedBy.length === 1) {
      orphanedItemIds.push(item.id)
    } else {
      sharedItemIds.push(item.id)
    }
  }

  return { sharedItemIds, orphanedItemIds }
}

export function getDinerTotals(bill: Bill): DinerTotal[] {
  const dinerIds = bill.diners.map((diner) => diner.id)
  const dinerWeights = Object.fromEntries(bill.diners.map((diner) => [diner.id, diner.partySize]))
  const subtotals = computeDinerSubtotals(bill.items, dinerIds, dinerWeights)
  const billSubtotal = computeBillSubtotal(bill.items)
  const tipTotal = computeTipTotal(billSubtotal, bill.tip)
  const tipShares = computeDinerTipShares(dinerIds, subtotals, tipTotal)
  return computeDinerTotals(dinerIds, subtotals, tipShares)
}

export function getBillPayableSummary(bill: Bill): BillPayableSummary {
  return computeBillPayableSummary(getDinerTotals(bill), bill.currency, bill.roundUpPayments)
}
