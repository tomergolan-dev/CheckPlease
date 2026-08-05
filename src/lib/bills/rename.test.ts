import { describe, expect, it } from 'vitest'
import { createInMemoryBillsRepository } from './test-helpers'
import { renameCompletedBill } from './rename'
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

describe('renameCompletedBill', () => {
  it('renames a completed bill', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await renameCompletedBill('u1', 'bill-1', 'Japanika', repository)

    expect(result).toEqual({ ok: true, data: expect.objectContaining({ restaurantName: 'Japanika' }) })
    expect(getRows()[0]!.data.restaurantName).toBe('Japanika')
  })

  it('trims whitespace', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await renameCompletedBill('u1', 'bill-1', '  Japanika  ', repository)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.restaurantName).toBe('Japanika')
  })

  it('an empty/whitespace-only name clears the title back to the generic default', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill({ restaurantName: 'Old Name' }) })
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await renameCompletedBill('u1', 'bill-1', '   ', repository)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.restaurantName).toBeUndefined()
  })

  it('does nothing to completed_at or other fields', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })
    const completedAtBefore = getRows()[0]!.completedAt

    await renameCompletedBill('u1', 'bill-1', 'Japanika', repository)

    expect(getRows()[0]!.completedAt).toEqual(completedAtBefore)
    expect(getRows()[0]!.status).toBe('completed')
  })

  it('not_found for another user\'s bill', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await renameCompletedBill('u2', 'bill-1', 'Hijack', repository)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('not_found for a bill that is still a draft', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })

    const result = await renameCompletedBill('u1', 'bill-1', 'Too early', repository)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('not_found for a nonexistent id', async () => {
    const { repository } = createInMemoryBillsRepository()
    const result = await renameCompletedBill('u1', 'does-not-exist', 'Japanika', repository)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })
})
