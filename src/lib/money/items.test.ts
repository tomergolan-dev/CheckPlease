import { describe, expect, it } from 'vitest'
import { computeBillSubtotal, computeDinerSubtotals, computeItemLineTotal, computeItemSplit } from './items'
import type { CalcItem } from './types'

describe('computeItemLineTotal', () => {
  it('multiplies unit price by quantity', () => {
    expect(computeItemLineTotal({ id: 'i1', unitPriceMinorUnits: 250, quantity: 3, sharedBy: ['d1'] })).toBe(750)
  })
})

describe('computeItemSplit', () => {
  it('splits a clean division evenly', () => {
    const item: CalcItem = { id: 'i1', unitPriceMinorUnits: 300, quantity: 1, sharedBy: ['d1', 'd2'] }
    expect(computeItemSplit(item)).toEqual({ d1: 150, d2: 150 })
  })

  it('gives the remainder to the first diner in sharedBy order', () => {
    const item: CalcItem = { id: 'i1', unitPriceMinorUnits: 100, quantity: 1, sharedBy: ['d1', 'd2', 'd3'] }
    expect(computeItemSplit(item)).toEqual({ d1: 34, d2: 33, d3: 33 })
  })

  it('accounts for quantity in the split', () => {
    const item: CalcItem = { id: 'i1', unitPriceMinorUnits: 200, quantity: 2, sharedBy: ['d1', 'd2'] }
    expect(computeItemSplit(item)).toEqual({ d1: 200, d2: 200 })
  })

  it('throws for an item with no assigned diners', () => {
    const item: CalcItem = { id: 'i1', unitPriceMinorUnits: 100, quantity: 1, sharedBy: [] }
    expect(() => computeItemSplit(item)).toThrow()
  })
})

describe('computeDinerSubtotals', () => {
  it('sums each diner share across items and keeps diners with no items at zero', () => {
    const items: CalcItem[] = [
      { id: 'i1', unitPriceMinorUnits: 300, quantity: 1, sharedBy: ['d1', 'd2'] },
      { id: 'i2', unitPriceMinorUnits: 500, quantity: 2, sharedBy: ['d3'] },
    ]
    const subtotals = computeDinerSubtotals(items, ['d1', 'd2', 'd3', 'd4'])
    expect(subtotals).toEqual({ d1: 150, d2: 150, d3: 1000, d4: 0 })
  })

  it('subtotals always sum back to the bill subtotal', () => {
    const items: CalcItem[] = [
      { id: 'i1', unitPriceMinorUnits: 101, quantity: 1, sharedBy: ['d1', 'd2', 'd3'] },
      { id: 'i2', unitPriceMinorUnits: 77, quantity: 3, sharedBy: ['d1'] },
      { id: 'i3', unitPriceMinorUnits: 500, quantity: 1, sharedBy: ['d2', 'd3'] },
    ]
    const dinerIds = ['d1', 'd2', 'd3']
    const subtotals = computeDinerSubtotals(items, dinerIds)
    const sum = dinerIds.reduce((total, id) => total + subtotals[id]!, 0)
    expect(sum).toBe(computeBillSubtotal(items))
  })

  it('rotates the leftover agora fairly across repeated equally-shared items instead of always favoring one diner', () => {
    // Same 3 diners share 3 identical ₪1.00 items — each item alone splits 34/33/33 with the
    // extra agora going to whoever's won it least so far, so it should rotate d1 -> d2 -> d3
    // and land on a perfectly equal 100/100/100, not the 102/99/99 a fixed lowest-index
    // tie-break would produce across all three items.
    const items: CalcItem[] = [
      { id: 'i1', unitPriceMinorUnits: 100, quantity: 1, sharedBy: ['d1', 'd2', 'd3'] },
      { id: 'i2', unitPriceMinorUnits: 100, quantity: 1, sharedBy: ['d1', 'd2', 'd3'] },
      { id: 'i3', unitPriceMinorUnits: 100, quantity: 1, sharedBy: ['d1', 'd2', 'd3'] },
    ]
    const subtotals = computeDinerSubtotals(items, ['d1', 'd2', 'd3'])
    expect(subtotals).toEqual({ d1: 100, d2: 100, d3: 100 })
  })
})
