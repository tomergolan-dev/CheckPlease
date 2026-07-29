import { allocateProportionally } from './allocate'
import type { MinorUnits, TipConfig } from './types'

const BASIS_POINTS_DENOMINATOR = 10_000

/** Rounds to the nearest minor unit, half up. */
export function computeTipTotal(subtotalMinorUnits: MinorUnits, tip: TipConfig): MinorUnits {
  const numerator = subtotalMinorUnits * tip.valueBasisPoints
  return Math.round(numerator / BASIS_POINTS_DENOMINATOR)
}

/** Allocates the total tip across diners, weighted by each diner's subtotal. */
export function computeDinerTipShares(
  dinerIds: string[],
  dinerSubtotals: Record<string, MinorUnits>,
  tipTotal: MinorUnits
): Record<string, MinorUnits> {
  const weights = dinerIds.map((id) => dinerSubtotals[id] ?? 0)
  const shares = allocateProportionally(tipTotal, weights)
  return Object.fromEntries(dinerIds.map((id, index) => [id, shares[index] ?? 0]))
}
