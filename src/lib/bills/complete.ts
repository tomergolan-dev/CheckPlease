import { drizzleBillsRepository, type BillsRepository, type MarkCompletedResult } from './repository'

/** The one-way draft → completed transition ("Confirm payment" / restart's "Save to My Bills"). */
export async function completeBill(
  userId: string,
  billId: string,
  repository: BillsRepository = drizzleBillsRepository
): Promise<MarkCompletedResult> {
  return repository.markCompleted({ id: billId, userId })
}
