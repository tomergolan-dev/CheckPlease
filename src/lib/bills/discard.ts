import { drizzleBillsRepository, type BillsRepository, type DeleteDraftResult } from './repository'

/**
 * Permanently deletes the caller's server-side draft row (restart flow's "Discard"). Named
 * distinctly from the store's local `discardBill` action to avoid confusion between the local
 * state clear and this server call — callers fire both.
 */
export async function discardServerDraft(
  userId: string,
  billId: string,
  repository: BillsRepository = drizzleBillsRepository
): Promise<DeleteDraftResult> {
  return repository.deleteDraft({ id: billId, userId })
}
