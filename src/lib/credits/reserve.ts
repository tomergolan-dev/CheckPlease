import { drizzleCreditsRepository, type CreditsRepository } from './repository'

/**
 * Reserve → finalize/refund lifecycle for scan consumption (see Post-MVP Architecture in
 * CLAUDE.md): `reserveCredit` deducts atomically before the paid vision-API call; a usable result
 * needs no further action (the reservation from `reserveCredit` already is the final state — there
 * is deliberately no `finalizeCredit`); `refundCredit` restores the credit on a hard failure or
 * zero usable items.
 */

export type ReserveResult = { ok: true; balance: number } | { ok: false; reason: 'insufficient_credits' }

export async function reserveCredit(
  userId: string,
  scanId: string,
  repository: CreditsRepository = drizzleCreditsRepository
): Promise<ReserveResult> {
  const result = await repository.applyLedgerEntry({
    userId,
    type: 'consumption',
    amount: -1,
    relatedScanId: scanId,
    idempotencyKey: `consumption:${scanId}`,
  })

  if (!result.applied && result.reason === 'insufficient_credits') {
    return { ok: false, reason: 'insufficient_credits' }
  }
  // `applied: true`, or a `duplicate` (a legitimate retry of an already-reserved scan) — either
  // way the credit is (still) reserved for this scanId.
  return { ok: true, balance: result.balance }
}

export async function refundCredit(
  userId: string,
  scanId: string,
  repository: CreditsRepository = drizzleCreditsRepository
): Promise<{ ok: true; balance: number }> {
  const result = await repository.applyLedgerEntry({
    userId,
    type: 'refund',
    amount: 1,
    relatedScanId: scanId,
    idempotencyKey: `refund:${scanId}`,
  })
  // A duplicate refund attempt for an already-refunded scan is a safe no-op, not an error.
  return { ok: true, balance: result.balance }
}
