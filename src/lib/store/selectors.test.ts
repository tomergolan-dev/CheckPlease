import { describe, expect, it } from 'vitest'
import { getBillPayableSummary, getDinerDefaultPositions, getDinerRemovalImpact, getDinerTotals } from './selectors'
import type { Bill, Diner, Item } from './types'

function diner(id: string, name?: string, partySize = 1): Diner {
  return { id, name, partySize, color: 'blue' }
}

function bill(diners: Diner[], items: Item[]): Bill {
  return {
    id: 'bill-1',
    createdAt: 0,
    updatedAt: 0,
    currency: 'ILS',
    roundUpPayments: false,
    nextDinerColorIndex: diners.length,
    diners,
    items,
    tip: { mode: 'percentage', valueBasisPoints: 0 },
  }
}

describe('getDinerDefaultPositions', () => {
  it('numbers default-named diners sequentially by position', () => {
    const diners = [diner('d1'), diner('d2'), diner('d3')]
    expect(getDinerDefaultPositions(diners)).toEqual({ d1: 1, d2: 2, d3: 3 })
  })

  it('closes the gap when a diner is removed, matching the product example', () => {
    // Diner 1, Diner 2, Diner 3 -> remove Diner 2 -> Diner 1, Diner 2 (not Diner 1, Diner 3)
    const afterRemoval = [diner('d1'), diner('d3')]
    expect(getDinerDefaultPositions(afterRemoval)).toEqual({ d1: 1, d3: 2 })
  })

  it('omits diners with a custom name and does not let them consume a number', () => {
    const diners = [diner('d1'), diner('d2', 'Daniel & Dana'), diner('d3')]
    expect(getDinerDefaultPositions(diners)).toEqual({ d1: 1, d3: 3 })
  })

  it('is unaffected by renaming another diner, since array position does not change', () => {
    const before = [diner('d1'), diner('d2'), diner('d3')]
    expect(getDinerDefaultPositions(before)).toEqual({ d1: 1, d2: 2, d3: 3 })

    const afterRename = [diner('d1'), diner('d2', 'Cohen Family'), diner('d3')]
    expect(getDinerDefaultPositions(afterRename)).toEqual({ d1: 1, d3: 3 })
  })
})

describe('getDinerRemovalImpact', () => {
  const item1: Item = {
    id: 'i1',
    name: 'Pasta',
    unitPriceMinorUnits: 1000,
    quantity: 1,
    sharedBy: ['d1', 'd2'],
    source: 'manual',
    sortIndex: 0,
  }
  const item2: Item = {
    id: 'i2',
    name: 'Espresso',
    unitPriceMinorUnits: 500,
    quantity: 1,
    sharedBy: ['d1'],
    source: 'manual',
    sortIndex: 1,
  }
  const testBill = bill([diner('d1'), diner('d2')], [item1, item2])

  it('classifies items the diner shares with others as safe', () => {
    const impact = getDinerRemovalImpact(testBill, 'd2')
    expect(impact.sharedItemIds).toEqual(['i1'])
    expect(impact.orphanedItemIds).toEqual([])
  })

  it('classifies items where the diner is the sole assignee as orphaned', () => {
    const impact = getDinerRemovalImpact(testBill, 'd1')
    expect(impact.sharedItemIds).toEqual(['i1'])
    expect(impact.orphanedItemIds).toEqual(['i2'])
  })
})

describe('getDinerTotals / getBillPayableSummary', () => {
  it('wires the store data straight into the calculation engine with no adapter', () => {
    const diners = [diner('d1'), diner('d2')]
    const items: Item[] = [
      { id: 'i1', name: 'Pizza', unitPriceMinorUnits: 5000, quantity: 1, sharedBy: ['d1', 'd2'], source: 'manual', sortIndex: 0 },
    ]
    const testBill = bill(diners, items)
    testBill.tip = { mode: 'percentage', valueBasisPoints: 1000 }

    const totals = getDinerTotals(testBill)
    expect(totals.reduce((sum, d) => sum + d.totalMinorUnits, 0)).toBe(5500) // 50.00 + 10% tip

    const payable = getBillPayableSummary(testBill)
    expect(payable.exactGrandTotalMinorUnits).toBe(5500)
    expect(payable.payableGrandTotalMinorUnits).toBe(5500) // rounding disabled by default
  })

  it('weights a shared dish by each paying party\'s partySize, not by paying-party count', () => {
    // Tomer (party size 1), Sharon (party size 1), Roshatzki (party size 2) — 4 diners
    // total sharing a ₪200 dish should split into 4 equal ₪50 portions, so Roshatzki's
    // party of 2 pays ₪100 while Tomer and Sharon each pay ₪50 — not an equal ₪66.67 each.
    const diners = [diner('tomer'), diner('sharon'), diner('roshatzki', undefined, 2)]
    const items: Item[] = [
      {
        id: 'i1',
        name: 'Shared dish',
        unitPriceMinorUnits: 20000,
        quantity: 1,
        sharedBy: ['tomer', 'sharon', 'roshatzki'],
        source: 'manual',
        sortIndex: 0,
      },
    ]
    const testBill = bill(diners, items)

    const totals = getDinerTotals(testBill)
    expect(totals.find((d) => d.dinerId === 'tomer')?.totalMinorUnits).toBe(5000)
    expect(totals.find((d) => d.dinerId === 'sharon')?.totalMinorUnits).toBe(5000)
    expect(totals.find((d) => d.dinerId === 'roshatzki')?.totalMinorUnits).toBe(10000)
  })
})
