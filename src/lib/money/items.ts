import { allocateProportionally } from './allocate'
import type { CalcItem, MinorUnits } from './types'

export function computeItemLineTotal(item: CalcItem): MinorUnits {
  return item.unitPriceMinorUnits * item.quantity
}

/** Splits one item's line total equally across its assigned diners. */
export function computeItemSplit(item: CalcItem): Record<string, MinorUnits> {
  if (item.sharedBy.length === 0) {
    throw new Error(`Item ${item.id} has no assigned diners`)
  }

  const lineTotal = computeItemLineTotal(item)
  const weights = item.sharedBy.map(() => 1)
  const shares = allocateProportionally(lineTotal, weights)

  return Object.fromEntries(item.sharedBy.map((dinerId, index) => [dinerId, shares[index] ?? 0]))
}

/** Sums each diner's share across every item. Diners with no items still appear, at 0. */
export function computeDinerSubtotals(
  items: CalcItem[],
  dinerIds: string[]
): Record<string, MinorUnits> {
  const subtotals = Object.fromEntries(dinerIds.map((id) => [id, 0]))

  for (const item of items) {
    const split = computeItemSplit(item)
    for (const [dinerId, share] of Object.entries(split)) {
      subtotals[dinerId] = (subtotals[dinerId] ?? 0) + share
    }
  }

  return subtotals
}

export function computeBillSubtotal(items: CalcItem[]): MinorUnits {
  return items.reduce((sum, item) => sum + computeItemLineTotal(item), 0)
}
