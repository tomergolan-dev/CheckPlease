import { drizzleBillsRepository, type BillsRepository } from './repository'
import type { Bill } from './types'

export type SyncDraftResult =
  | { action: 'pushed' }
  | { action: 'push_rejected' }
  | { action: 'pulled'; bill: Bill | null }

/**
 * A single bidirectional operation, mirroring the one `/api/bills/sync` route named in CLAUDE.md:
 * `bill` present pushes it as the caller's active draft; `bill: null` pulls whatever draft the
 * caller already has in the cloud (or null). "Last-write-wins on updated_at" requires no
 * client-timestamp comparison — a push unconditionally overwrites, so whoever's push lands last
 * wins, which is correct precisely because concurrent multi-device editing isn't a target scenario.
 */
export async function syncDraft(
  userId: string,
  bill: Bill | null,
  repository: BillsRepository = drizzleBillsRepository
): Promise<SyncDraftResult> {
  if (bill) {
    const result = await repository.upsertDraft({ id: bill.id, userId, data: bill })
    return result.ok ? { action: 'pushed' } : { action: 'push_rejected' }
  }
  const draft = await repository.pullDraft(userId)
  return { action: 'pulled', bill: draft?.data ?? null }
}
