import { describe, expect, it } from 'vitest'
import { computeDinerTotals, computeGrandTotal } from './totals'

describe('computeDinerTotals', () => {
  it('combines subtotal and tip per diner', () => {
    const dinerIds = ['d1', 'd2']
    const subtotals = { d1: 1000, d2: 500 }
    const tipShares = { d1: 150, d2: 75 }
    expect(computeDinerTotals(dinerIds, subtotals, tipShares)).toEqual([
      { dinerId: 'd1', subtotalMinorUnits: 1000, tipMinorUnits: 150, totalMinorUnits: 1150 },
      { dinerId: 'd2', subtotalMinorUnits: 500, tipMinorUnits: 75, totalMinorUnits: 575 },
    ])
  })

  it('defaults missing entries to zero', () => {
    expect(computeDinerTotals(['d1'], {}, {})).toEqual([
      { dinerId: 'd1', subtotalMinorUnits: 0, tipMinorUnits: 0, totalMinorUnits: 0 },
    ])
  })
})

describe('computeGrandTotal', () => {
  it('sums every diner total', () => {
    const totals = computeDinerTotals(['d1', 'd2'], { d1: 1000, d2: 500 }, { d1: 150, d2: 75 })
    expect(computeGrandTotal(totals)).toBe(1725)
  })
})
