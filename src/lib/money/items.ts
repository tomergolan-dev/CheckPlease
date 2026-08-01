import { allocateProportionally } from './allocate'
import type { CalcItem, MinorUnits } from './types'

export function computeItemLineTotal(item: CalcItem): MinorUnits {
  return item.unitPriceMinorUnits * item.quantity
}

/**
 * Splits one item's line total across its assigned diners, weighted by each diner's
 * `partySize` (a diner id -> weight map — see `computeDinerSubtotals`) since a paying
 * party of 2 consumes twice the share of a shared dish as a party of 1. A diner missing
 * from `dinerWeights` falls back to weight 1. `remainderWinCounts` (diner id -> how many
 * previous items already gave that diner the leftover agora) lets repeated calls across a
 * bill's full item list stay fair.
 */
export function computeItemSplit(
  item: CalcItem,
  dinerWeights: Record<string, number> = {},
  remainderWinCounts: Record<string, number> = {}
): Record<string, MinorUnits> {
  if (item.sharedBy.length === 0) {
    throw new Error(`Item ${item.id} has no assigned diners`)
  }

  const lineTotal = computeItemLineTotal(item)
  const weights = item.sharedBy.map((dinerId) => dinerWeights[dinerId] ?? 1)
  const tieBreakPriority = item.sharedBy.map((dinerId) => remainderWinCounts[dinerId] ?? 0)
  const shares = allocateProportionally(lineTotal, weights, { tieBreakPriority })

  return Object.fromEntries(item.sharedBy.map((dinerId, index) => [dinerId, shares[index] ?? 0]))
}

/**
 * Sums each diner's share across every item. Diners with no items still appear, at 0.
 * `dinerWeights` (diner id -> `partySize`) weights every item split — a diner missing from
 * the map falls back to weight 1.
 *
 * When every diner sharing an item has equal weight (the common one-diner-per-party case),
 * the leftover agora is a full tie between them, so left to `allocateProportionally` alone
 * the same lowest-index diner would win that tie on every single item — a real bias over a
 * whole bill, not just an occasional rounding artifact. Tracking how many times each diner
 * has already won the leftover agora, and preferring whoever's won it least so far, turns
 * that into a fair rotation across the bill instead. With unequal weights (parties of
 * different sizes), the tie is generally broken already by the weights themselves — the
 * rotation only ever matters for diners whose weighted floor share ties.
 */
export function computeDinerSubtotals(
  items: CalcItem[],
  dinerIds: string[],
  dinerWeights: Record<string, number> = {}
): Record<string, MinorUnits> {
  const subtotals = Object.fromEntries(dinerIds.map((id) => [id, 0]))
  const remainderWinCounts = Object.fromEntries(dinerIds.map((id) => [id, 0]))

  for (const item of items) {
    const lineTotal = computeItemLineTotal(item)
    const weights = item.sharedBy.map((dinerId) => dinerWeights[dinerId] ?? 1)
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    const split = computeItemSplit(item, dinerWeights, remainderWinCounts)

    item.sharedBy.forEach((dinerId, index) => {
      const share = split[dinerId] ?? 0
      subtotals[dinerId] = (subtotals[dinerId] ?? 0) + share
      const weight = weights[index] ?? 1
      const floorShare = totalWeight > 0 ? Math.floor((lineTotal * weight) / totalWeight) : 0
      if (share > floorShare) {
        remainderWinCounts[dinerId] = (remainderWinCounts[dinerId] ?? 0) + 1
      }
    })
  }

  return subtotals
}

export function computeBillSubtotal(items: CalcItem[]): MinorUnits {
  return items.reduce((sum, item) => sum + computeItemLineTotal(item), 0)
}
