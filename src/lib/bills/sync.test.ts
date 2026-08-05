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
    expect(result).toEqual({ action: 'pushed', id: 'bill-1', data: makeBill() })
    expect(getRows()).toHaveLength(1)
    expect(getRows()[0]).toMatchObject({ id: 'bill-1', userId: 'u1', status: 'draft' })
  })

  it('push updates an existing draft owned by the same user', async () => {
    const { repository, getRows } = createInMemoryBillsRepository()
    await syncDraft('u1', makeBill({ restaurantName: 'First', updatedAt: 1000 }), repository)
    await syncDraft('u1', makeBill({ restaurantName: 'Second', updatedAt: 2000 }), repository)

    expect(getRows()).toHaveLength(1)
    expect(getRows()[0]!.data.restaurantName).toBe('Second')
  })

  it("push against another user's row is rejected and leaves it untouched", async () => {
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

  it('pull never returns a completed row', async () => {
    const { repository } = createInMemoryBillsRepository()
    await syncDraft('u1', makeBill(), repository)
    await repository.markCompleted({ id: 'bill-1', userId: 'u1' })

    const result = await syncDraft('u1', null, repository)
    expect(result).toEqual({ action: 'pulled', bill: null })
  })

  describe('one draft per user', () => {
    it('two devices pushing different draft ids for the same user converge to a single row', async () => {
      const { repository, getRows } = createInMemoryBillsRepository()

      const first = await syncDraft('u1', makeBill({ id: 'bill-device-a', updatedAt: 1000 }), repository)
      const second = await syncDraft('u1', makeBill({ id: 'bill-device-b', updatedAt: 2000 }), repository)

      expect(getRows()).toHaveLength(1)
      expect(first).toMatchObject({ action: 'pushed', id: 'bill-device-a' })
      // The second push reports back the *canonical* id (device A's — the row that already
      // existed for this user), not the id it pushed — this is what tells device B to adopt it.
      expect(second).toMatchObject({ action: 'pushed', id: 'bill-device-a' })
      expect(getRows()[0]!.id).toBe('bill-device-a')
    })

    it('a device pushing a stale draft to an existing row never overwrites another user\'s completed bill', async () => {
      const { repository, getRows } = createInMemoryBillsRepository()
      await syncDraft('u1', makeBill({ id: 'bill-a', updatedAt: 1000 }), repository)
      await repository.markCompleted({ id: 'bill-a', userId: 'u1' })

      // After completing, this user has no draft row — a new push starts a fresh one, and it's
      // never confused with (or merged into) the now-completed row.
      const result = await syncDraft('u1', makeBill({ id: 'bill-b', updatedAt: 2000 }), repository)

      expect(result).toMatchObject({ action: 'pushed', id: 'bill-b' })
      expect(getRows()).toHaveLength(2)
      expect(getRows().find((r) => r.id === 'bill-a')!.status).toBe('completed')
      expect(getRows().find((r) => r.id === 'bill-b')!.status).toBe('draft')
    })

    it('preserves the newest draft data by app-level updatedAt, regardless of which push arrives first', async () => {
      const olderPushFirst = createInMemoryBillsRepository()
      await syncDraft(
        'u1',
        makeBill({ id: 'bill-old', updatedAt: 1000, restaurantName: 'Older edit' }),
        olderPushFirst.repository
      )
      const r1 = await syncDraft(
        'u1',
        makeBill({ id: 'bill-new', updatedAt: 5000, restaurantName: 'Newer edit' }),
        olderPushFirst.repository
      )
      expect(r1).toMatchObject({ data: { restaurantName: 'Newer edit', updatedAt: 5000 } })
      expect(olderPushFirst.getRows()).toHaveLength(1)
      expect(olderPushFirst.getRows()[0]!.data.restaurantName).toBe('Newer edit')

      // Same two edits, opposite arrival order — the outcome must be identical: the newer edit
      // always wins, never whichever request happened to land first.
      const newerPushFirst = createInMemoryBillsRepository()
      await syncDraft(
        'u1',
        makeBill({ id: 'bill-new', updatedAt: 5000, restaurantName: 'Newer edit' }),
        newerPushFirst.repository
      )
      const r2 = await syncDraft(
        'u1',
        makeBill({ id: 'bill-old', updatedAt: 1000, restaurantName: 'Older edit' }),
        newerPushFirst.repository
      )
      expect(r2).toMatchObject({ data: { restaurantName: 'Newer edit', updatedAt: 5000 } })
      expect(newerPushFirst.getRows()).toHaveLength(1)
      expect(newerPushFirst.getRows()[0]!.data.restaurantName).toBe('Newer edit')
    })

    it('the merged row\'s persisted data always carries the surviving row\'s own id', async () => {
      const { repository, getRows } = createInMemoryBillsRepository()
      await syncDraft('u1', makeBill({ id: 'bill-device-a', updatedAt: 1000 }), repository)
      await syncDraft('u1', makeBill({ id: 'bill-device-b', updatedAt: 2000 }), repository)

      const row = getRows()[0]!
      expect(row.data.id).toBe(row.id)
    })

    it('concurrent pushes from two devices for the same user never create more than one row', async () => {
      const { repository, getRows } = createInMemoryBillsRepository()

      const [a, b] = await Promise.all([
        syncDraft('u1', makeBill({ id: 'bill-device-a', updatedAt: 1000, restaurantName: 'A' }), repository),
        syncDraft('u1', makeBill({ id: 'bill-device-b', updatedAt: 2000, restaurantName: 'B' }), repository),
      ])

      expect(getRows()).toHaveLength(1)
      // Both calls must agree on which row is canonical — there is only ever one truth, even
      // though `a` resolves with its own (first-committed) state and `b` resolves with the
      // final, already-merged state, since `b`'s write only happens after `a`'s has landed.
      expect(a).toMatchObject({ action: 'pushed' })
      expect(b).toMatchObject({ action: 'pushed' })
      if (a.action === 'pushed' && b.action === 'pushed') {
        expect(a.id).toBe(b.id)
        expect(b.data.restaurantName).toBe('B')
      }
      // The higher app-level updatedAt (B's) is what survives — never just "whoever wrote last."
      expect(getRows()[0]!.data.restaurantName).toBe('B')
    })

    it('a completed bill is unaffected by other draft pushes and merges for the same user', async () => {
      const { repository, getRows } = createInMemoryBillsRepository()
      await syncDraft('u1', makeBill({ id: 'bill-a', restaurantName: 'Finished dinner' }), repository)
      const completed = await repository.markCompleted({ id: 'bill-a', userId: 'u1' })
      expect(completed).toMatchObject({ ok: true })

      // Two more devices now converge onto a brand-new draft — the completed row must never be
      // touched, resurrected, or merged into by any of this.
      await syncDraft('u1', makeBill({ id: 'bill-b', updatedAt: 2000, restaurantName: 'New bill 1' }), repository)
      await syncDraft('u1', makeBill({ id: 'bill-c', updatedAt: 3000, restaurantName: 'New bill 2' }), repository)

      const finishedRow = getRows().find((r) => r.id === 'bill-a')!
      expect(finishedRow.status).toBe('completed')
      expect(finishedRow.data.restaurantName).toBe('Finished dinner')

      const draftRows = getRows().filter((r) => r.status === 'draft')
      expect(draftRows).toHaveLength(1)
      expect(draftRows[0]!.data.restaurantName).toBe('New bill 2')

      // listCompleted must still only ever see the one completed bill, untouched by any of this.
      const completedList = await repository.listCompleted('u1')
      expect(completedList).toHaveLength(1)
      expect(completedList[0]!.id).toBe('bill-a')
    })
  })
})
