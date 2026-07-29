import { describe, expect, it } from 'vitest'
import { computeBillPayableSummary, roundUpToWholeUnit } from './payable'
import type { DinerTotal } from './totals'

function dinerTotal(dinerId: string, totalMinorUnits: number): DinerTotal {
  return { dinerId, subtotalMinorUnits: totalMinorUnits, tipMinorUnits: 0, totalMinorUnits }
}

describe('roundUpToWholeUnit', () => {
  it('rounds a partial shekel amount up to the next whole shekel', () => {
    expect(roundUpToWholeUnit(3333, 'ILS')).toBe(3400) // ₪33.33 -> ₪34
  })

  it('leaves a whole-shekel amount unchanged', () => {
    expect(roundUpToWholeUnit(3400, 'ILS')).toBe(3400) // ₪34.00 -> ₪34
  })

  it('leaves zero unchanged', () => {
    expect(roundUpToWholeUnit(0, 'ILS')).toBe(0)
  })
})

describe('computeBillPayableSummary', () => {
  const dinerTotals: DinerTotal[] = [dinerTotal('d1', 3334), dinerTotal('d2', 3333), dinerTotal('d3', 3333)]

  it('never modifies the exact totals from the calculation engine', () => {
    const summary = computeBillPayableSummary(dinerTotals, 'ILS', true)
    expect(summary.diners.map((d) => d.exactMinorUnits)).toEqual([3334, 3333, 3333])
    // The original DinerTotal objects passed in are untouched too.
    expect(dinerTotals.map((d) => d.totalMinorUnits)).toEqual([3334, 3333, 3333])
  })

  it('rounds each payable total up to the next whole shekel when enabled', () => {
    const summary = computeBillPayableSummary(dinerTotals, 'ILS', true)
    expect(summary.diners.map((d) => d.payableMinorUnits)).toEqual([3400, 3400, 3400])
  })

  it('leaves already-whole amounts unchanged even when rounding is enabled', () => {
    const wholeDinerTotals: DinerTotal[] = [dinerTotal('d1', 3400), dinerTotal('d2', 5000)]
    const summary = computeBillPayableSummary(wholeDinerTotals, 'ILS', true)
    expect(summary.diners.map((d) => d.payableMinorUnits)).toEqual([3400, 5000])
    expect(summary.roundingSurplusMinorUnits).toBe(0)
  })

  it('computes the rounding surplus matching the ₪100 -> +₪2 -> ₪102 example', () => {
    const summary = computeBillPayableSummary(dinerTotals, 'ILS', true)
    expect(summary.exactGrandTotalMinorUnits).toBe(10_000) // ₪100.00
    expect(summary.roundingSurplusMinorUnits).toBe(200) // +₪2.00
    expect(summary.payableGrandTotalMinorUnits).toBe(10_200) // ₪102.00
  })

  it('changes only the displayed payable totals when disabled, leaving exact totals and grand total identical', () => {
    const enabled = computeBillPayableSummary(dinerTotals, 'ILS', true)
    const disabled = computeBillPayableSummary(dinerTotals, 'ILS', false)

    expect(disabled.diners.map((d) => d.payableMinorUnits)).toEqual(dinerTotals.map((d) => d.totalMinorUnits))
    expect(disabled.roundingSurplusMinorUnits).toBe(0)
    expect(disabled.payableGrandTotalMinorUnits).toBe(disabled.exactGrandTotalMinorUnits)

    // The exact side of both runs is identical regardless of the toggle.
    expect(enabled.exactGrandTotalMinorUnits).toBe(disabled.exactGrandTotalMinorUnits)
    expect(enabled.diners.map((d) => d.exactMinorUnits)).toEqual(disabled.diners.map((d) => d.exactMinorUnits))
  })
})
