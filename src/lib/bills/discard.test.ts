import { describe, expect, it } from 'vitest'
import { createInMemoryBillsRepository } from './test-helpers'
import { discardServerDraft } from './discard'
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

describe('discardServerDraft', () => {
  it('deletes an owned draft', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })

    const result = await discardServerDraft('u1', 'bill-1', repository)

    expect(result).toEqual({ ok: true })
    expect(getRows()).toHaveLength(0)
  })

  it('no-ops on another user\'s row', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })

    const result = await discardServerDraft('u2', 'bill-1', repository)

    expect(result).toEqual({ ok: false, reason: 'not_found' })
    expect(getRows()).toHaveLength(1)
  })

  it('no-ops on an already-completed row — server-side enforcement of the deferred delete-completed boundary', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-1', userId: 'u1', data: makeBill() })
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await discardServerDraft('u1', 'bill-1', repository)

    expect(result).toEqual({ ok: false, reason: 'not_found' })
    expect(getRows()).toHaveLength(1)
    expect(getRows()[0]!.status).toBe('completed')
  })

  it('not_found for a nonexistent id', async () => {
    const { repository } = createInMemoryBillsRepository()
    const result = await discardServerDraft('u1', 'does-not-exist', repository)
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })
})
