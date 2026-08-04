import { describe, expect, it } from 'vitest'
import { createInMemoryBillsRepository } from './test-helpers'
import { completeBill } from './complete'
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

describe('completeBill', () => {
  it('marks a draft completed and sets completedAt', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })

    const result = await completeBill('u1', 'bill-1', repository)

    expect(result.ok).toBe(true)
    expect(getRows()[0]!.status).toBe('completed')
    expect(getRows()[0]!.completedAt).not.toBeNull()
    if (result.ok) {
      expect(result.data.status).toBe('completed')
    }
  })

  it('is idempotent — completedAt never moves on a second call', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })

    await completeBill('u1', 'bill-1', repository)
    const firstCompletedAt = getRows()[0]!.completedAt

    await new Promise((resolve) => setTimeout(resolve, 5))
    await completeBill('u1', 'bill-1', repository)
    const secondCompletedAt = getRows()[0]!.completedAt

    expect(secondCompletedAt).toEqual(firstCompletedAt)
  })

  it('not_found for a nonexistent id', async () => {
    const { repository } = createInMemoryBillsRepository()
    const result = await completeBill('u1', 'does-not-exist', repository)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })

  it('not_found for an id owned by another user — collapses identically to nonexistent', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })

    const result = await completeBill('u2', 'bill-1', repository)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })
})
