import { describe, expect, it } from 'vitest'
import { basisPointsToPercentage, computeDinerTipShares, computeTipTotal, percentageToBasisPoints } from './tip'

describe('percentageToBasisPoints', () => {
  it('matches the basis-point examples from the spec', () => {
    expect(percentageToBasisPoints(0)).toBe(0)
    expect(percentageToBasisPoints(10)).toBe(1000)
    expect(percentageToBasisPoints(12)).toBe(1200)
    expect(percentageToBasisPoints(12.5)).toBe(1250)
    expect(percentageToBasisPoints(15)).toBe(1500)
  })

  it('clamps negative or invalid input to zero', () => {
    expect(percentageToBasisPoints(-5)).toBe(0)
    expect(percentageToBasisPoints(NaN)).toBe(0)
  })
})

describe('basisPointsToPercentage', () => {
  it('round-trips with percentageToBasisPoints', () => {
    expect(basisPointsToPercentage(percentageToBasisPoints(12.5))).toBe(12.5)
    expect(basisPointsToPercentage(0)).toBe(0)
  })
})

describe('computeTipTotal', () => {
  it('matches the basis-point examples from the spec', () => {
    expect(computeTipTotal(10_000, { mode: 'percentage', valueBasisPoints: 0 })).toBe(0)
    expect(computeTipTotal(10_000, { mode: 'percentage', valueBasisPoints: 1000 })).toBe(1000)
    expect(computeTipTotal(10_000, { mode: 'percentage', valueBasisPoints: 1200 })).toBe(1200)
    expect(computeTipTotal(10_000, { mode: 'percentage', valueBasisPoints: 1250 })).toBe(1250)
    expect(computeTipTotal(10_000, { mode: 'percentage', valueBasisPoints: 1500 })).toBe(1500)
  })

  it('rounds half up to the nearest minor unit', () => {
    // 1 agora * 50% = 0.5 agorot, rounds up to 1.
    expect(computeTipTotal(1, { mode: 'percentage', valueBasisPoints: 5000 })).toBe(1)
  })

  it('returns zero tip on a zero subtotal', () => {
    expect(computeTipTotal(0, { mode: 'percentage', valueBasisPoints: 1500 })).toBe(0)
  })
})

describe('computeDinerTipShares', () => {
  it('allocates proportionally to subtotal and sums exactly to the tip total', () => {
    const dinerIds = ['d1', 'd2', 'd3']
    const subtotals = { d1: 100, d2: 200, d3: 0 }
    const shares = computeDinerTipShares(dinerIds, subtotals, 30)
    expect(shares).toEqual({ d1: 10, d2: 20, d3: 0 })
  })

  it('handles a remainder deterministically while still summing exactly', () => {
    const dinerIds = ['d1', 'd2', 'd3']
    const subtotals = { d1: 100, d2: 100, d3: 100 }
    const shares = computeDinerTipShares(dinerIds, subtotals, 10)
    const sum = dinerIds.reduce((total, id) => total + shares[id]!, 0)
    expect(sum).toBe(10)
  })

  it('gives a diner with no subtotal no tip', () => {
    const dinerIds = ['d1', 'd2']
    const subtotals = { d1: 500, d2: 0 }
    const shares = computeDinerTipShares(dinerIds, subtotals, 75)
    expect(shares.d2).toBe(0)
  })
})
