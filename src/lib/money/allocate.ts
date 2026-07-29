import type { MinorUnits } from './types'

/**
 * Splits an integer amount across weighted parties using the largest-remainder method,
 * so the result always sums back to `totalMinorUnits` exactly — no minor unit is ever
 * created or lost to rounding. Ties (equal fractional remainders) resolve to the lowest
 * index first, so results are deterministic given the same inputs.
 *
 * If every weight is zero (e.g. no diner has any subtotal yet), the amount is split
 * evenly across all parties instead of being left undefined.
 */
export function allocateProportionally(
  totalMinorUnits: MinorUnits,
  weights: number[]
): MinorUnits[] {
  const count = weights.length
  if (count === 0) {
    throw new Error('allocateProportionally requires at least one party to allocate to')
  }
  if (totalMinorUnits === 0) {
    return weights.map(() => 0)
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const effectiveWeights = totalWeight > 0 ? weights : weights.map(() => 1)
  const effectiveTotalWeight = totalWeight > 0 ? totalWeight : count

  const shares = effectiveWeights.map((weight) => {
    const numerator = totalMinorUnits * weight
    const base = Math.floor(numerator / effectiveTotalWeight)
    const remainder = numerator - base * effectiveTotalWeight
    return { base, remainder }
  })

  const allocated = shares.reduce((sum, share) => sum + share.base, 0)
  const remaining = totalMinorUnits - allocated

  const order = shares
    .map((share, index) => ({ index, remainder: share.remainder }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  const result = shares.map((share) => share.base)
  for (let i = 0; i < remaining; i++) {
    const winner = order[i]
    if (winner) {
      result[winner.index] = (result[winner.index] ?? 0) + 1
    }
  }

  return result
}
