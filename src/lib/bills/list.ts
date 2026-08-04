import { drizzleBillsRepository, type BillsRepository, type CompletedBillRow } from './repository'

/** "My Bills" — every completed bill for the caller, most recently completed first. */
export async function listCompletedBills(
  userId: string,
  repository: BillsRepository = drizzleBillsRepository
): Promise<CompletedBillRow[]> {
  return repository.listCompleted(userId)
}
