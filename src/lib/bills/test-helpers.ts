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
 * src/lib/credits/test-helpers.ts's `createInMemoryCreditsRepository` for consistency, including
 * its single-yield-point-for-concurrency-modeling technique (see `upsertDraft` below): one
 * `await Promise.resolve()` right at the top, before any read, and nothing after it ever awaits
 * again. That's what makes `Promise.all`-driven "concurrent" pushes in tests interleave the way
 * concurrent DB transactions do — each call yields once, then the microtask queue resumes queued
 * calls one at a time in order, and since a resumed call never yields again, its read-decide-write
 * runs as one atomic block before the next call gets a turn. This is needed here for the same
 * reason as the credits fake: `upsertDraft` must enforce "at most one draft row per user" the way
 * the real repository's `bills_one_draft_per_user` unique index does (see schema.ts) — without
 * the single yield point, two concurrent calls could both observe "no draft row for this user yet"
 * before either writes, letting a race create two rows in the fake that the real database would
 * have collapsed to one.
 */
export function createInMemoryBillsRepository(): {
  repository: BillsRepository
  getRows: () => FakeBillRow[]
} {
  const rows = new Map<string, FakeBillRow>()

  const repository: BillsRepository = {
    async upsertDraft({ id, userId, data }): Promise<UpsertDraftResult> {
      await Promise.resolve()

      const now = new Date()

      // This account's one canonical draft row, if it already exists — regardless of whether its
      // id matches the incoming one (see repository.ts's real `upsertDraft` for why: two devices
      // that have never synced can each hold a different local draft id for the same account).
      const existingForUser = [...rows.values()].find((row) => row.userId === userId && row.status === 'draft')

      if (existingForUser) {
        // Newer-wins by each side's own app-level `data.updatedAt` — never by arrival order —
        // and the winning data's `id` is normalized to the row's own id either way, so the
        // persisted blob never disagrees with the row it lives in.
        const incomingIsNewer = data.updatedAt >= existingForUser.data.updatedAt
        const finalData: Bill = incomingIsNewer ? { ...data, id: existingForUser.id } : existingForUser.data
        rows.set(existingForUser.id, { ...existingForUser, data: finalData, updatedAt: now })
        return { ok: true, id: existingForUser.id, data: finalData }
      }

      // No draft row for this user yet. `id` might still collide with an unrelated row — another
      // user's, or this same user's own completed bill that happens to share this id — which must
      // never be resurrected or overwritten by a plain draft push.
      const existingById = rows.get(id)
      if (existingById && (existingById.userId !== userId || existingById.status !== 'draft')) {
        return { ok: false, reason: 'conflict' }
      }

      rows.set(id, { id, userId, status: 'draft', data, completedAt: null, updatedAt: now, createdAt: now })
      return { ok: true, id, data }
    },

    async pullDraft(userId) {
      // At most one draft row per user (see `bills_one_draft_per_user`), so this is really just
      // "find the one," not a tie-break — `.sort`/take-first stays as defense-in-depth only.
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
