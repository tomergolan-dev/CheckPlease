import { drizzleBillsRepository, type BillsRepository, type RenameCompletedResult } from './repository'

/** Renames a completed bill's title — the one exception to "My Bills" being strictly read-only. */
export async function renameCompletedBill(
  userId: string,
  billId: string,
  restaurantName: string,
  repository: BillsRepository = drizzleBillsRepository
): Promise<RenameCompletedResult> {
  return repository.renameCompleted({ id: billId, userId, restaurantName })
}
