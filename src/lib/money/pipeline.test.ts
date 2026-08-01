import { describe, expect, it } from 'vitest'
import { computeBillSubtotal, computeDinerSubtotals } from './items'
import { computeDinerTipShares, computeTipTotal } from './tip'
import { computeDinerTotals, computeGrandTotal } from './totals'
import type { CalcItem, TipConfig } from './types'

/**
 * The core trust invariant: every diner's final total must sum back exactly to the
 * bill's subtotal plus tip. No minor unit is ever created or lost across the two
 * allocation stages (item -> diners, tip -> diners), regardless of how unevenly the
 * bill splits.
 */
function runPipeline(
  dinerIds: string[],
  items: CalcItem[],
  tip: TipConfig,
  dinerWeights: Record<string, number> = {}
) {
  const subtotals = computeDinerSubtotals(items, dinerIds, dinerWeights)
  const billSubtotal = computeBillSubtotal(items)
  const tipTotal = computeTipTotal(billSubtotal, tip)
  const tipShares = computeDinerTipShares(dinerIds, subtotals, tipTotal)
  const dinerTotals = computeDinerTotals(dinerIds, subtotals, tipShares)
  const grandTotal = computeGrandTotal(dinerTotals)
  return { billSubtotal, tipTotal, dinerTotals, grandTotal }
}

describe('bill calculation pipeline', () => {
  it('reconciles exactly for an even split with no tip', () => {
    const dinerIds = ['d1', 'd2']
    const items: CalcItem[] = [{ id: 'i1', unitPriceMinorUnits: 5000, quantity: 1, sharedBy: dinerIds }]
    const { billSubtotal, tipTotal, grandTotal } = runPipeline(dinerIds, items, {
      mode: 'percentage',
      valueBasisPoints: 0,
    })
    expect(grandTotal).toBe(billSubtotal + tipTotal)
  })

  it('reconciles exactly for an uneven split with a fractional tip percentage', () => {
    const dinerIds = ['d1', 'd2', 'd3']
    const items: CalcItem[] = [
      { id: 'i1', unitPriceMinorUnits: 3333, quantity: 1, sharedBy: dinerIds },
      { id: 'i2', unitPriceMinorUnits: 899, quantity: 2, sharedBy: ['d1', 'd2'] },
      { id: 'i3', unitPriceMinorUnits: 1250, quantity: 1, sharedBy: ['d3'] },
    ]
    const { billSubtotal, tipTotal, grandTotal } = runPipeline(dinerIds, items, {
      mode: 'percentage',
      valueBasisPoints: 1250,
    })
    expect(grandTotal).toBe(billSubtotal + tipTotal)
  })

  it('reconciles exactly with multiple items producing simultaneous remainders', () => {
    const dinerIds = ['d1', 'd2', 'd3', 'd4', 'd5']
    const items: CalcItem[] = [
      { id: 'i1', unitPriceMinorUnits: 1700, quantity: 1, sharedBy: dinerIds },
      { id: 'i2', unitPriceMinorUnits: 101, quantity: 3, sharedBy: ['d1', 'd2', 'd3'] },
      { id: 'i3', unitPriceMinorUnits: 250, quantity: 1, sharedBy: ['d4', 'd5'] },
      { id: 'i4', unitPriceMinorUnits: 999, quantity: 1, sharedBy: ['d1'] },
    ]
    const { billSubtotal, tipTotal, grandTotal } = runPipeline(dinerIds, items, {
      mode: 'percentage',
      valueBasisPoints: 1500,
    })
    expect(grandTotal).toBe(billSubtotal + tipTotal)
  })

  it('reconciles exactly when a diner has ordered nothing', () => {
    const dinerIds = ['d1', 'd2', 'd3']
    const items: CalcItem[] = [{ id: 'i1', unitPriceMinorUnits: 4321, quantity: 1, sharedBy: ['d1', 'd2'] }]
    const { billSubtotal, tipTotal, grandTotal, dinerTotals } = runPipeline(dinerIds, items, {
      mode: 'percentage',
      valueBasisPoints: 1000,
    })
    expect(dinerTotals.find((d) => d.dinerId === 'd3')?.totalMinorUnits).toBe(0)
    expect(grandTotal).toBe(billSubtotal + tipTotal)
  })

  it('reconciles exactly with no tip at all (tip is optional)', () => {
    const dinerIds = ['d1', 'd2', 'd3']
    const items: CalcItem[] = [
      { id: 'i1', unitPriceMinorUnits: 777, quantity: 1, sharedBy: dinerIds },
      { id: 'i2', unitPriceMinorUnits: 333, quantity: 2, sharedBy: ['d2'] },
    ]
    const { billSubtotal, tipTotal, grandTotal } = runPipeline(dinerIds, items, {
      mode: 'percentage',
      valueBasisPoints: 0,
    })
    expect(tipTotal).toBe(0)
    expect(grandTotal).toBe(billSubtotal)
  })

  it('reconciles exactly across a sweep of odd, non-round bill amounts and party sizes', () => {
    const unitPrices = [199, 1301, 4999, 7, 12345, 333, 1]
    for (let partyCount = 1; partyCount <= 7; partyCount++) {
      const dinerIds = Array.from({ length: partyCount }, (_, i) => `d${i}`)
      const items: CalcItem[] = unitPrices.map((price, i) => ({
        id: `i${i}`,
        unitPriceMinorUnits: price,
        quantity: (i % 3) + 1,
        sharedBy: dinerIds.slice(0, (i % partyCount) + 1),
      }))
      for (const bps of [0, 1000, 1200, 1250, 1500, 3333]) {
        const { billSubtotal, tipTotal, grandTotal } = runPipeline(dinerIds, items, {
          mode: 'percentage',
          valueBasisPoints: bps,
        })
        expect(grandTotal).toBe(billSubtotal + tipTotal)
      }
    }
  })

  it('reconciles exactly when parties have unequal partySize weights, and tip follows the weighted subtotal', () => {
    // Tomer (1), Sharon (1), Roshatzki (2) — a party of 2 should end up paying roughly
    // double a party of 1 for the same shared dishes, and the tip (proportional to each
    // diner's subtotal) should follow that same weighting automatically.
    const dinerIds = ['tomer', 'sharon', 'roshatzki']
    const dinerWeights = { tomer: 1, sharon: 1, roshatzki: 2 }
    const items: CalcItem[] = [{ id: 'i1', unitPriceMinorUnits: 20000, quantity: 1, sharedBy: dinerIds }]
    const { billSubtotal, tipTotal, dinerTotals, grandTotal } = runPipeline(
      dinerIds,
      items,
      { mode: 'percentage', valueBasisPoints: 1000 },
      dinerWeights
    )
    const tomerTotal = dinerTotals.find((d) => d.dinerId === 'tomer')!.totalMinorUnits
    const sharonTotal = dinerTotals.find((d) => d.dinerId === 'sharon')!.totalMinorUnits
    const roshatzkiTotal = dinerTotals.find((d) => d.dinerId === 'roshatzki')!.totalMinorUnits
    expect(tomerTotal).toBe(5500) // ₪50 + 10% tip
    expect(sharonTotal).toBe(5500)
    expect(roshatzkiTotal).toBe(11000) // ₪100 + 10% tip
    expect(grandTotal).toBe(billSubtotal + tipTotal)
  })

  it('reconciles exactly across a sweep of odd amounts with unequal partySize weights', () => {
    const unitPrices = [199, 1301, 4999, 7, 12345, 333, 1]
    const dinerIds = ['d0', 'd1', 'd2', 'd3']
    const dinerWeights = { d0: 1, d1: 2, d2: 3, d3: 1 }
    const items: CalcItem[] = unitPrices.map((price, i) => ({
      id: `i${i}`,
      unitPriceMinorUnits: price,
      quantity: (i % 3) + 1,
      sharedBy: dinerIds.slice(0, (i % dinerIds.length) + 1),
    }))
    for (const bps of [0, 1000, 1200, 1250, 1500, 3333]) {
      const { billSubtotal, tipTotal, grandTotal } = runPipeline(
        dinerIds,
        items,
        { mode: 'percentage', valueBasisPoints: bps },
        dinerWeights
      )
      expect(grandTotal).toBe(billSubtotal + tipTotal)
    }
  })
})
