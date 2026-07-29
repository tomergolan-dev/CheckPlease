import { getCurrencyMinorUnitExponent } from './format'
import { computeGrandTotal } from './totals'
import type { DinerTotal } from './totals'
import type { MinorUnits } from './types'

export interface PayableDinerTotal {
  dinerId: string
  /** The diner's exact total from the calculation engine — never altered by rounding. */
  exactMinorUnits: MinorUnits
  /** What the diner is actually asked to pay — equal to exactMinorUnits unless rounding is enabled. */
  payableMinorUnits: MinorUnits
}

export interface BillPayableSummary {
  exactGrandTotalMinorUnits: MinorUnits
  payableGrandTotalMinorUnits: MinorUnits
  /** The extra amount collected purely from rounding up; 0 when rounding is disabled. */
  roundingSurplusMinorUnits: MinorUnits
  diners: PayableDinerTotal[]
}

/** Rounds up to the next whole major currency unit (e.g. the next whole shekel for ILS). Amounts already on a whole unit are returned unchanged. */
export function roundUpToWholeUnit(amount: MinorUnits, currency: string): MinorUnits {
  const unitSize = 10 ** getCurrencyMinorUnitExponent(currency)
  const remainder = amount % unitSize
  return remainder === 0 ? amount : amount + (unitSize - remainder)
}

/**
 * Presentation-layer only: derives what each diner should actually pay from the exact
 * calculation engine's totals. The exact totals themselves are never modified — this
 * only decides what to display and, when rounding is enabled, adds a small surplus on
 * top of the exact total so every diner pays a whole-currency-unit amount.
 */
export function computeBillPayableSummary(
  dinerTotals: DinerTotal[],
  currency: string,
  roundUpEnabled: boolean
): BillPayableSummary {
  const diners: PayableDinerTotal[] = dinerTotals.map((diner) => ({
    dinerId: diner.dinerId,
    exactMinorUnits: diner.totalMinorUnits,
    payableMinorUnits: roundUpEnabled
      ? roundUpToWholeUnit(diner.totalMinorUnits, currency)
      : diner.totalMinorUnits,
  }))

  const exactGrandTotalMinorUnits = computeGrandTotal(dinerTotals)
  const payableGrandTotalMinorUnits = diners.reduce((sum, diner) => sum + diner.payableMinorUnits, 0)

  return {
    exactGrandTotalMinorUnits,
    payableGrandTotalMinorUnits,
    roundingSurplusMinorUnits: payableGrandTotalMinorUnits - exactGrandTotalMinorUnits,
    diners,
  }
}
