import { drizzleBillsRepository, type BillsRepository } from './repository'
import type { Bill } from './types'

export type SyncDraftResult =
  | { action: 'pushed'; id: string; data: Bill }
  | { action: 'push_rejected' }
  | { action: 'pulled'; bill: Bill | null }

/**
 * A single bidirectional operation, mirroring the one `/api/bills/sync` route named in CLAUDE.md:
 * `bill` present pushes it as the caller's active draft; `bill: null` pulls whatever draft the
 * caller already has in the cloud (or null). A push always returns the canonical draft's id/data
 * — see `upsertDraft` in repository.ts — since a user's one true cloud draft can end up under a
 * different id and/or with different data than what was just pushed (another device's draft won
 * the "keep the newer one" merge); the caller (the client's push-sync hook) uses this to adopt
 * the canonical id and never silently lose a fresher local edit.
 */
export async function syncDraft(
  userId: string,
  bill: Bill | null,
  repository: BillsRepository = drizzleBillsRepository
): Promise<SyncDraftResult> {
  if (bill) {
    const result = await repository.upsertDraft({ id: bill.id, userId, data: bill })
    return result.ok ? { action: 'pushed', id: result.id, data: result.data } : { action: 'push_rejected' }
  }
  const draft = await repository.pullDraft(userId)
  return { action: 'pulled', bill: draft?.data ?? null }
}
