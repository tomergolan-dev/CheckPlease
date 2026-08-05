import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bills } from '@/lib/db/schema'
import type { Bill } from './types'

export type UpsertDraftResult = { ok: true } | { ok: false; reason: 'conflict' }
export type MarkCompletedResult = { ok: true; data: Bill } | { ok: false; reason: 'not_found' }
export type DeleteDraftResult = { ok: true } | { ok: false; reason: 'not_found' }
export type RenameCompletedResult = { ok: true; data: Bill } | { ok: false; reason: 'not_found' }

export interface CompletedBillRow {
  id: string
  data: Bill
  completedAt: Date
  createdAt: Date
}

export interface BillsRepository {
  upsertDraft(input: { id: string; userId: string; data: Bill }): Promise<UpsertDraftResult>
  pullDraft(userId: string): Promise<{ id: string; data: Bill; updatedAt: Date } | null>
  markCompleted(input: { id: string; userId: string }): Promise<MarkCompletedResult>
  deleteDraft(input: { id: string; userId: string }): Promise<DeleteDraftResult>
  renameCompleted(input: { id: string; userId: string; restaurantName: string }): Promise<RenameCompletedResult>
  listCompleted(userId: string): Promise<CompletedBillRow[]>
}

/**
 * The real repository, backed by the actual database. Every operation is a single guarded
 * statement (ownership/status enforced in the WHERE clause), not a select-then-branch
 * transaction — no race window, one round trip, mirroring src/lib/credits/repository.ts's
 * guarded-write style. Unlike that module, no `isUniqueViolation`/`.cause`-walking helper is
 * needed here — `upsertDraft`'s guarded `onConflictDoUpdate` never throws on the PK collision it
 * exists to handle, there's nothing to catch.
 */
export const drizzleBillsRepository: BillsRepository = {
  /**
   * `id` is client-generated and reused directly as the PK — never server-assigned — so a plain
   * `onConflictDoUpdate({ target })` would let any signed-in client overwrite any row it can guess
   * the id of. The `where` clause is Postgres's `ON CONFLICT ... DO UPDATE ... WHERE <cond>`,
   * evaluated against the *existing* row before the update — if false, the row is left untouched
   * and excluded from RETURNING, which is what makes ownership+status enforcement possible in one
   * statement. 0 rows returned means either the row belongs to someone else, or it's already
   * `completed` (a draft sync must never resurrect/overwrite a completed bill).
   */
  async upsertDraft({ id, userId, data }) {
    const now = new Date()
    const rows = await db
      .insert(bills)
      .values({ id, userId, status: 'draft', data, updatedAt: now, createdAt: now })
      .onConflictDoUpdate({
        target: bills.id,
        set: { data, updatedAt: now },
        where: and(eq(bills.userId, userId), eq(bills.status, 'draft')),
      })
      .returning({ id: bills.id })
    return rows.length > 0 ? { ok: true } : { ok: false, reason: 'conflict' }
  },

  /**
   * `ORDER BY updated_at DESC LIMIT 1` is the tie-break for the documented edge case of more than
   * one draft row existing for a user (two devices each started an independent guest bill before
   * either ever signed in, both later signing into the same account) — most-recently-touched wins,
   * the other is simply never surfaced. A deliberate scope limit, not solved with UI this phase.
   */
  async pullDraft(userId) {
    const [row] = await db
      .select({ id: bills.id, data: bills.data, updatedAt: bills.updatedAt })
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.status, 'draft')))
      .orderBy(desc(bills.updatedAt))
      .limit(1)
    return row ?? null
  },

  /**
   * Deliberately has no `status = 'draft'` filter, making this idempotent — a duplicate "Confirm
   * payment" retry re-applies harmlessly, `completed_at` never moves once set (COALESCE). A
   * nonexistent id and a wrong-owner id both collapse to the same `not_found`, so the API never
   * leaks whether a bill id exists to a non-owner. `data`'s embedded `status` is patched purely so
   * a client reading `data` directly (e.g. from GET /api/bills) never sees a self-contradictory
   * blob — no server logic ever branches on that embedded copy.
   */
  async markCompleted({ id, userId }) {
    const now = new Date()
    const [row] = await db
      .update(bills)
      .set({
        status: 'completed',
        completedAt: sql`coalesce(${bills.completedAt}, ${now})`,
        data: sql`jsonb_set(${bills.data}, '{status}', '"completed"')`,
      })
      .where(and(eq(bills.id, id), eq(bills.userId, userId)))
      .returning({ data: bills.data })
    return row ? { ok: true, data: row.data } : { ok: false, reason: 'not_found' }
  },

  /**
   * The `status = 'draft'` filter means attempting to delete an already-completed bill silently
   * no-ops — this is the server-side enforcement of "deleting a completed bill: deferred, not
   * built this phase," not just a UI omission.
   */
  async deleteDraft({ id, userId }) {
    const [row] = await db
      .delete(bills)
      .where(and(eq(bills.id, id), eq(bills.userId, userId), eq(bills.status, 'draft')))
      .returning({ id: bills.id })
    return row ? { ok: true } : { ok: false, reason: 'not_found' }
  },

  /**
   * The one mutation a completed bill's `data` can still receive — guarded by `status =
   * 'completed'` (renaming a draft goes through the normal edit flow instead, not this route),
   * ownership, and never touches `completed_at`. An empty/whitespace-only name removes the key
   * entirely (via jsonb's `-` operator) rather than storing an empty string, so the bill falls
   * back to the same generic default label as a bill that was never renamed.
   */
  async renameCompleted({ id, userId, restaurantName }) {
    const trimmed = restaurantName.trim()
    const now = new Date()
    const dataExpr =
      trimmed.length > 0
        ? sql`jsonb_set(${bills.data}, '{restaurantName}', to_jsonb(${trimmed}::text))`
        : sql`(${bills.data} - 'restaurantName')`
    const [row] = await db
      .update(bills)
      .set({ data: dataExpr, updatedAt: now })
      .where(and(eq(bills.id, id), eq(bills.userId, userId), eq(bills.status, 'completed')))
      .returning({ data: bills.data })
    return row ? { ok: true, data: row.data } : { ok: false, reason: 'not_found' }
  },

  async listCompleted(userId) {
    const rows = await db
      .select({ id: bills.id, data: bills.data, completedAt: bills.completedAt, createdAt: bills.createdAt })
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.status, 'completed')))
      .orderBy(desc(bills.completedAt))
    // completedAt is always set by markCompleted before a row's status can ever be 'completed'.
    return rows.map((row) => ({ ...row, completedAt: row.completedAt! }))
  },
}
