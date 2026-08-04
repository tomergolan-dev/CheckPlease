import { describe, expect, it } from 'vitest'
import { createInMemoryBillsRepository } from './test-helpers'
import { syncDraft } from './sync'
import type { Bill } from './types'

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    createdAt: 1000,
    updatedAt: 1000,
    currency: 'ILS',
    roundUpPayments: false,
    nextDinerColorIndex: 2,
    diners: [
      { id: 'd1', partySize: 1, color: 'blue' },
      { id: 'd2', partySize: 1, color: 'green' },
    ],
    items: [],
    tip: { mode: 'percentage', valueBasisPoints: 0 },
    status: 'draft',
    ...overrides,
  }
}

describe('syncDraft', () => {
  it('push creates a new draft row', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    const result = await syncDraft('u1', makeBill(), repository)
    expect(result).toEqual({ action: 'pushed' })
    expect(getRows()).toHaveLength(1)
    expect(getRows()[0]).toMatchObject({ id: 'bill-1', userId: 'u1', status: 'draft' })
  })

  it('push updates an existing draft owned by the same user', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await syncDraft('u1', makeBill({ restaurantName: 'First' }), repository)
    await syncDraft('u1', makeBill({ restaurantName: 'Second' }), repository)

    expect(getRows()).toHaveLength(1)
    expect(getRows()[0]!.data.restaurantName).toBe('Second')
  })

  it('push against another user\'s row is rejected and leaves it untouched', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await syncDraft('u1', makeBill({ restaurantName: 'Original' }), repository)

    const result = await syncDraft('u2', makeBill({ restaurantName: 'Hijack' }), repository)

    expect(result).toEqual({ action: 'push_rejected' })
    expect(getRows()).toHaveLength(1)
    expect(getRows()[0]!.userId).toBe('u1')
    expect(getRows()[0]!.data.restaurantName).toBe('Original')
  })

  it('push against an already-completed row is rejected and never flips it back or touches data', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await syncDraft('u1', makeBill({ restaurantName: 'Original' }), repository)
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await syncDraft('u1', makeBill({ restaurantName: 'Reopened' }), repository)

    expect(result).toEqual({ action: 'push_rejected' })
    expect(getRows()[0]!.status).toBe('completed')
    expect(getRows()[0]!.data.restaurantName).toBe('Original')
  })

  it('pull returns null when the user has no draft', async () => {
    const { repository } = createInMemoryBillsRepository()
    const result = await syncDraft('u1', null, repository)
    expect(result).toEqual({ action: 'pulled', bill: null })
  })

  it('pull returns the most-recently-updated draft when more than one exists', async () => {
    const { repository } = createInMemoryBillsRepository()
    await repository.upsertDraft({ id: 'bill-old', userId: 'u1', data: makeBill({ id: 'bill-old' }) })
    await new Promise((resolve) => setTimeout(resolve, 5))
    await repository.upsertDraft({ id: 'bill-new', userId: 'u1', data: makeBill({ id: 'bill-new' }) })

    const result = await syncDraft('u1', null, repository)
    expect(result).toEqual({ action: 'pulled', bill: expect.objectContaining({ id: 'bill-new' }) })
  })

  it('pull never returns a completed row', async () => {
    const { repository } = createInMemoryBillsRepository()
    await syncDraft('u1', makeBill(), repository)
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await syncDraft('u1', null, repository)
    expect(result).toEqual({ action: 'pulled', bill: null })
  })
})
