import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bills } from '@/lib/db/schema'
import type { Bill } from './types'

/** Postgres's unique_violation code — same pattern as src/lib/credits/repository.ts. */
const UNIQUE_VIOLATION = '23505'

/** Drizzle wraps the real driver error in a `DrizzleQueryError`, with the actual Postgres error
 * (the one carrying `.code`) nested under `.cause` — mirrors src/lib/credits/repository.ts's
 * `isUniqueViolation` exactly. */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('code' in error && error.code === UNIQUE_VIOLATION) return true
  if ('cause' in error) return isUniqueViolation(error.cause)
  return false
}

export type UpsertDraftResult = { ok: true; id: string; data: Bill } | { ok: false; reason: 'conflict' }
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
 * guarded-write style.
 */
export const drizzleBillsRepository: BillsRepository = {
  /**
   * Enforces "exactly one active draft row per user" (see `bills_one_draft_per_user` in
   * schema.ts) — `id` is client-generated, so two devices that have never synced can each hold a
   * different local draft id for the same account. This never lets a second row be created for
   * that account; it always converges onto the one canonical row and reports its id/data back so
   * the caller (sync.ts → the client) can adopt it.
   *
   * Two statements, in order:
   *
   * 1. An atomic compare-and-swap `UPDATE ... WHERE user_id = ? AND status = 'draft'` — matches
   *    the account's canonical draft row regardless of whether its id equals the incoming one.
   *    The `CASE` picks the newer side by comparing each bill's own app-level `data.updatedAt`
   *    (never the DB `updated_at` column, which only reflects request-arrival order, not which
   *    edit actually happened later) — entirely within the single UPDATE statement, so Postgres's
   *    row lock makes this immune to the lost-update race a separate SELECT-then-UPDATE would
   *    have under real concurrent pushes. `jsonb_set(..., '{id}', to_jsonb(id))` normalizes the
   *    winning data's embedded `id` to the row's own id (referencing the table's own `id` column
   *    mid-statement) — the persisted blob's `id` always matches the row it lives in, even when
   *    the incoming push's data carried a different (losing) local id.
   * 2. If that UPDATE touches 0 rows, this account has no draft row yet — insert the incoming id
   *    as its first one, still guarded by the same ownership/status `where` as before (never
   *    resurrect a row that turns out to belong to someone else, or one of this user's own
   *    completed bills that happens to share this exact id). If a *second* device is racing to
   *    create this account's very first draft row at the same moment, one of the two inserts
   *    wins outright; the other trips `bills_one_draft_per_user`'s unique_violation, caught below
   *    and resolved by recursing once — the retry's UPDATE now finds the winner's row and merges
   *    into it via the same newer-wins comparison as any other convergence.
   */
  async upsertDraft({ id, userId, data }) {
    const now = new Date()
    const incomingJson = JSON.stringify(data)

    const [merged] = await db
      .update(bills)
      .set({
        data: sql`case
          when (${bills.data}->>'updatedAt')::bigint <= ${data.updatedAt}
          then jsonb_set(${incomingJson}::jsonb, '{id}', to_jsonb(${bills.id}))
          else ${bills.data}
        end`,
        updatedAt: now,
      })
      .where(and(eq(bills.userId, userId), eq(bills.status, 'draft')))
      .returning({ id: bills.id, data: bills.data })

    if (merged) {
      return { ok: true, id: merged.id, data: merged.data }
    }

    try {
      const [inserted] = await db
        .insert(bills)
        .values({ id, userId, status: 'draft', data, updatedAt: now, createdAt: now })
        .onConflictDoUpdate({
          target: bills.id,
          set: { data, updatedAt: now },
          where: and(eq(bills.userId, userId), eq(bills.status, 'draft')),
        })
        .returning({ id: bills.id, data: bills.data })
      return inserted ? { ok: true, id: inserted.id, data: inserted.data } : { ok: false, reason: 'conflict' }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return drizzleBillsRepository.upsertDraft({ id, userId, data })
      }
      throw error
    }
  },

  /** At most one draft row per user now (see `bills_one_draft_per_user`), so this always returns
   * that account's one canonical draft — `.limit(1)` stays as defense-in-depth, not a tie-break. */
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
