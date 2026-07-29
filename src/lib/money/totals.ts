import type { MinorUnits } from './types'

export interface DinerTotal {
  dinerId: string
  subtotalMinorUnits: MinorUnits
  tipMinorUnits: MinorUnits
  totalMinorUnits: MinorUnits
}

export function computeDinerTotals(
  dinerIds: string[],
  dinerSubtotals: Record<string, MinorUnits>,
  dinerTipShares: Record<string, MinorUnits>
): DinerTotal[] {
  return dinerIds.map((dinerId) => {
    const subtotalMinorUnits = dinerSubtotals[dinerId] ?? 0
    const tipMinorUnits = dinerTipShares[dinerId] ?? 0
    return {
      dinerId,
      subtotalMinorUnits,
      tipMinorUnits,
      totalMinorUnits: subtotalMinorUnits + tipMinorUnits,
    }
  })
}

export function computeGrandTotal(dinerTotals: DinerTotal[]): MinorUnits {
  return dinerTotals.reduce((sum, diner) => sum + diner.totalMinorUnits, 0)
}
