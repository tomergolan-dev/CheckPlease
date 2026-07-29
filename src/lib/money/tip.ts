import { allocateProportionally } from './allocate'
import type { MinorUnits, TipConfig } from './types'

const BASIS_POINTS_DENOMINATOR = 10_000
const BASIS_POINTS_PER_PERCENT = 100

/** Converts a human percentage (12.5) to integer basis points (1250). Negative/invalid input clamps to 0. */
export function percentageToBasisPoints(percentage: number): number {
  if (!Number.isFinite(percentage) || percentage < 0) return 0
  return Math.round(percentage * BASIS_POINTS_PER_PERCENT)
}

/** Converts integer basis points (1250) back to a human percentage (12.5). */
export function basisPointsToPercentage(basisPoints: number): number {
  return basisPoints / BASIS_POINTS_PER_PERCENT
}

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
