import type {
  BillsRepository,
  CompletedBillRow,
  DeleteDraftResult,
  MarkCompletedResult,
  RenameCompletedResult,
  UpsertDraftResult,
} from './repository'
import type { Bill } from './types'

export interface FakeBillRow {
  id: string
  userId: string
  status: 'draft' | 'completed'
  data: Bill
  completedAt: Date | null
  updatedAt: Date
  createdAt: Date
}

/**
 * A stateful in-memory fake `BillsRepository`, for unit-testing sync.ts/complete.ts/discard.ts/
 * list.ts without a live Postgres connection — same shape as
 * src/lib/credits/test-helpers.ts's `createInMemoryCreditsRepository` for consistency, but
 * without its deliberate single-yield-point-for-concurrency-modeling subtlety: this module is
 * last-write-wins, not a guarded decrement with a "never goes negative" race to model.
 */
export function createInMemoryBillsRepository(): {
  repository: BillsRepository
  getRows: () => FakeBillRow[]
} {
  const rows = new Map<string, FakeBillRow>()

  const repository: BillsRepository = {
    async upsertDraft({ id, userId, data }): Promise<UpsertDraftResult> {
      const now = new Date()
      const existing = rows.get(id)
      if (existing && (existing.userId !== userId || existing.status !== 'draft')) {
        return { ok: false, reason: 'conflict' }
      }
      rows.set(id, {
        id,
        userId,
        status: 'draft',
        data,
        completedAt: existing?.completedAt ?? null,
        updatedAt: now,
        createdAt: existing?.createdAt ?? now,
      })
      return { ok: true }
    },

    async pullDraft(userId) {
      const drafts = [...rows.values()]
        .filter((row) => row.userId === userId && row.status === 'draft')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      const draft = drafts[0]
      return draft ? { id: draft.id, data: draft.data, updatedAt: draft.updatedAt } : null
    },

    async markCompleted({ id, userId }): Promise<MarkCompletedResult> {
      const existing = rows.get(id)
      if (!existing || existing.userId !== userId) {
        return { ok: false, reason: 'not_found' }
      }
      const completedAt = existing.completedAt ?? new Date()
      const data: Bill = { ...existing.data, status: 'completed' }
      rows.set(id, { ...existing, status: 'completed', completedAt, data })
      return { ok: true, data }
    },

    async deleteDraft({ id, userId }): Promise<DeleteDraftResult> {
      const existing = rows.get(id)
      if (!existing || existing.userId !== userId || existing.status !== 'draft') {
        return { ok: false, reason: 'not_found' }
      }
      rows.delete(id)
      return { ok: true }
    },

    async renameCompleted({ id, userId, restaurantName }): Promise<RenameCompletedResult> {
      const existing = rows.get(id)
      if (!existing || existing.userId !== userId || existing.status !== 'completed') {
        return { ok: false, reason: 'not_found' }
      }
      const trimmed = restaurantName.trim()
      const data: Bill =
        trimmed.length > 0
          ? { ...existing.data, restaurantName: trimmed }
          : { ...existing.data, restaurantName: undefined }
      rows.set(id, { ...existing, data })
      return { ok: true, data }
    },

    async listCompleted(userId): Promise<CompletedBillRow[]> {
      return [...rows.values()]
        .filter((row) => row.userId === userId && row.status === 'completed')
        .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
        .map((row) => ({ id: row.id, data: row.data, completedAt: row.completedAt!, createdAt: row.createdAt }))
    },
  }

  return { repository, getRows: () => [...rows.values()] }
}
