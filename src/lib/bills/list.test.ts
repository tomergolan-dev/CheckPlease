import { describe, expect, it } from 'vitest'
import { createInMemoryBillsRepository } from './test-helpers'
import { listCompletedBills } from './list'
import type { Bill } from './types'

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    createdAt: 1000,
    updatedAt: 1000,
    currency: 'ILS',
    roundUpPayments: false,
    nextDinerColorIndex: 1,
    diners: [{ id: 'd1', partySize: 1, color: 'blue' }],
    items: [],
    tip: { mode: 'percentage', valueBasisPoints: 0 },
    status: 'draft',
    ...overrides,
  }
}

describe('listCompletedBills', () => {
  it('only returns the caller\'s completed rows, excluding their own draft and other users\' rows', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'b-done-1', userId: 'u1', data: makeBill({ id: 'b-done-1' }) })
    await repository.markCompleted({ id: 'b-done-1', userId: 'u1' })
    // The caller's current active draft, started fresh after completing the bill above (only one
    // draft row can ever exist per user) — must never show up in "My Bills".
    await repository.upsertDraft({ id: 'b-draft', userId: 'u1', data: makeBill({ id: 'b-draft' }) })
    await repository.upsertDraft({ id: 'b-other', userId: 'u2', data: makeBill({ id: 'b-other' }) })
    await repository.markCompleted({ id: 'b-other', userId: 'u2' })

    const result = await listCompletedBills('u1', repository)

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('b-done-1')
  })

  it('orders by completedAt descending', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'b-first', userId: 'u1', data: makeBill({ id: 'b-first' }) })
    await repository.markCompleted({ id: 'b-first', userId: 'u1' })

    await new Promise((resolve) => setTimeout(resolve, 5))

    await repository.upsertDraft({ id: 'b-second', userId: 'u1', data: makeBill({ id: 'b-second' }) })
    await repository.markCompleted({ id: 'b-second', userId: 'u1' })

    const result = await listCompletedBills('u1', repository)

    expect(result.map((row) => row.id)).toEqual(['b-second', 'b-first'])
  })
})
