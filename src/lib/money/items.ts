import { allocateProportionally } from './allocate'
import type { CalcItem, MinorUnits } from './types'

export function computeItemLineTotal(item: CalcItem): MinorUnits {
  return item.unitPriceMinorUnits * item.quantity
}

/**
 * Splits one item's line total equally across its assigned diners. `remainderWinCounts`
 * (diner id -> how many previous items already gave that diner the leftover agora) lets
 * repeated calls across a bill's full item list stay fair — see `computeDinerSubtotals`.
 */
export function computeItemSplit(
  item: CalcItem,
  remainderWinCounts: Record<string, number> = {}
): Record<string, MinorUnits> {
  if (item.sharedBy.length === 0) {
    throw new Error(`Item ${item.id} has no assigned diners`)
  }

  const lineTotal = computeItemLineTotal(item)
  const weights = item.sharedBy.map(() => 1)
  const tieBreakPriority = item.sharedBy.map((dinerId) => remainderWinCounts[dinerId] ?? 0)
  const shares = allocateProportionally(lineTotal, weights, { tieBreakPriority })

  return Object.fromEntries(item.sharedBy.map((dinerId, index) => [dinerId, shares[index] ?? 0]))
}

/**
 * Sums each diner's share across every item. Diners with no items still appear, at 0.
 *
 * Every equally-shared item's leftover agora is a full tie between its diners (equal
 * weights produce an identical remainder for all of them), so left to `allocateProportionally`
 * alone the same lowest-index diner would win that tie on every single item — a real bias
 * over a whole bill, not just an occasional rounding artifact. Tracking how many times each
 * diner has already won the leftover agora, and preferring whoever's won it least so far,
 * turns that into a fair rotation across the bill instead.
 */
export function computeDinerSubtotals(
  items: CalcItem[],
  dinerIds: string[]
): Record<string, MinorUnits> {
  const subtotals = Object.fromEntries(dinerIds.map((id) => [id, 0]))
  const remainderWinCounts = Object.fromEntries(dinerIds.map((id) => [id, 0]))

  for (const item of items) {
    const floorShare = Math.floor(computeItemLineTotal(item) / item.sharedBy.length)
    const split = computeItemSplit(item, remainderWinCounts)
    for (const [dinerId, share] of Object.entries(split)) {
      subtotals[dinerId] = (subtotals[dinerId] ?? 0) + share
      if (share > floorShare) {
        remainderWinCounts[dinerId] = (remainderWinCounts[dinerId] ?? 0) + 1
      }
    }
  }

  return subtotals
}

export function computeBillSubtotal(items: CalcItem[]): MinorUnits {
  return items.reduce((sum, item) => sum + computeItemLineTotal(item), 0)
}
