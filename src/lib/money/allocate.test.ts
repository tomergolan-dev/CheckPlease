import { describe, expect, it } from 'vitest'
import { allocateProportionally } from './allocate'

describe('allocateProportionally', () => {
  it('splits evenly when the total divides cleanly', () => {
    expect(allocateProportionally(300, [1, 1, 1])).toEqual([100, 100, 100])
  })

  it('gives the remainder to the lowest index on a tie', () => {
    expect(allocateProportionally(100, [1, 1, 1])).toEqual([34, 33, 33])
  })

  it('distributes multiple simultaneous remainders in index order', () => {
    // 5 equal parties, 17 total: base 3 each, 2 leftover units go to indices 0 and 1.
    expect(allocateProportionally(17, [1, 1, 1, 1, 1])).toEqual([4, 4, 3, 3, 3])
  })

  it('weights shares proportionally to unequal weights', () => {
    const result = allocateProportionally(300, [1, 2, 3])
    expect(result).toEqual([50, 100, 150])
    expect(result.reduce((a, b) => a + b, 0)).toBe(300)
  })

  it('falls back to an even split when every weight is zero', () => {
    expect(allocateProportionally(10, [0, 0, 0])).toEqual([4, 3, 3])
  })

  it('returns all zeros when the total is zero, regardless of weights', () => {
    expect(allocateProportionally(0, [1, 5, 10])).toEqual([0, 0, 0])
  })

  it('gives the full amount to a single party', () => {
    expect(allocateProportionally(1234, [1])).toEqual([1234])
  })

  it('always sums back to the total across a range of totals and party counts', () => {
    for (let count = 1; count <= 6; count++) {
      const weights = Array.from({ length: count }, (_, i) => i + 1)
      for (let total = 0; total <= 50; total++) {
        const result = allocateProportionally(total, weights)
        expect(result.reduce((a, b) => a + b, 0)).toBe(total)
        expect(result.every((share) => share >= 0)).toBe(true)
      }
    }
  })

  it('throws when there are no parties to allocate to', () => {
    expect(() => allocateProportionally(100, [])).toThrow()
  })

  describe('tieBreakPriority', () => {
    it('gives the remainder to the lowest-priority party instead of the lowest index', () => {
      expect(allocateProportionally(100, [1, 1, 1], { tieBreakPriority: [5, 0, 2] })).toEqual([33, 34, 33])
    })

    it('still breaks ties by index when priorities are equal', () => {
      expect(allocateProportionally(100, [1, 1, 1], { tieBreakPriority: [0, 0, 0] })).toEqual([34, 33, 33])
    })

    it('falls back to lowest-index-wins when omitted, unchanged from before', () => {
      expect(allocateProportionally(100, [1, 1, 1])).toEqual([34, 33, 33])
    })
  })
})
