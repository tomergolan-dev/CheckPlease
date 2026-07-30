import { allocateProportionally } from './allocate'
import type { MinorUnits, TipConfig } from './types'

const BASIS_POINTS_DENOMINATOR = 10_000
const BASIS_POINTS_PER_PERCENT = 100

/** Converts a human percentage (12.5) to integer basis points (1250). Negative/invalid input clamps to 0. */
export function percentageToBasisPoints(percentage: number): number {
  if (!Number.isFinite(percentage) || percentage < 0) return 0
  return Math.round(percentage * BASIS_POINTS_PER_PERCENT)
}

/** A non-negative decimal number, optionally with a fractional part — "12", "12.5", ".5" all match. */
const VALID_PERCENTAGE_PATTERN = /^(\d+(\.\d*)?|\.\d+)$/

/**
 * Accepts a comma as a decimal separator (common on Hebrew/mobile keyboards) and normalizes
 * it to a period, so "12,5" and "12.5" are equivalent without the user having to think about it.
 */
export function normalizePercentageInput(value: string): string {
  return value.trim().replace(',', '.')
}

/**
 * Parses a user-typed percentage string for the custom tip input. Returns `null` for anything
 * that isn't a clean non-negative number — including trailing garbage like "12abc" — so invalid
 * input is a distinguishable failure, never silently coerced into a plausible-looking 0.
 */
export function parsePercentageInput(value: string): number | null {
  const normalized = normalizePercentageInput(value)
  if (!VALID_PERCENTAGE_PATTERN.test(normalized)) return null
  return Number.parseFloat(normalized)
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
