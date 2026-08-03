import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { creditBalances, creditLedger, purchases } from '@/lib/db/schema'
import type { ApplyLedgerResult, LedgerEntryInput } from './types'

/** Postgres's unique_violation code — same pattern as src/lib/auth/register.ts. */
const UNIQUE_VIOLATION = '23505'

/** Drizzle wraps the real driver error in a `DrizzleQueryError`, with the actual Postgres error
 * (the one carrying `.code`) nested under `.cause` — a bare `error.code` check never matches a
 * real database violation, only a hand-constructed test double, so this walks the `.cause` chain. */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('code' in error && error.code === UNIQUE_VIOLATION) return true
  if ('cause' in error) return isUniqueViolation(error.cause)
  return false
}

export interface GrantPurchaseInput {
  userId: string
  packType: string
  creditsGranted: number
  amountPaidMinorUnits: number
  currency: string
  provider: string
  providerRef: string
}

export type GrantPurchaseResult = { granted: true; balance: number } | { granted: false; balance: number }

export interface CreditsRepository {
  getBalance(userId: string): Promise<number>
  applyLedgerEntry(input: LedgerEntryInput): Promise<ApplyLedgerResult>
  recordPurchaseAndCredit(input: GrantPurchaseInput): Promise<GrantPurchaseResult>
}

/**
 * The real repository, backed by the actual database. Functions in reserve.ts/grants.ts take a
 * repository as a parameter rather than importing `db` directly, specifically so they can be
 * unit-tested against an in-memory fake without a live Postgres connection — same pattern as
 * src/lib/auth/register.ts's `UserRepository`.
 */
export const drizzleCreditsRepository: CreditsRepository = {
  async getBalance(userId) {
    const [row] = await db
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .limit(1)
    return row?.balance ?? 0
  },

  /**
   * The single atomic primitive every credit operation composes from. One DB transaction:
   *   1. Idempotency check — a row already at this `idempotencyKey` means this exact operation
   *      already happened; return `duplicate` with the current balance, no write.
   *   2. Guarded balance write — additive entries always succeed (upsert); debits only succeed
   *      if the balance covers them (`balance >= -amount` in the UPDATE's WHERE clause) — a debit
   *      that doesn't match any row (insufficient balance, or no balance row exists yet) returns
   *      `insufficient_credits`.
   *   3. Ledger insert — the permanent record of what happened.
   *
   * Race handling: two genuinely concurrent calls for the *same* idempotencyKey both pass the
   * step-1 check (neither commits before the other reads), then serialize on the balance row's
   * lock in step 2 — the second one applies its write too, then fails the step-3 ledger insert's
   * unique constraint. That failure must roll back the *entire* transaction (including the extra
   * balance write) — Postgres does this automatically once the query throws inside `db
   * .transaction`. The outer catch below re-reads the balance fresh, after the rollback, so the
   * caller always sees the correct post-rollback value.
   */
  async applyLedgerEntry(input) {
    try {
      return await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: creditLedger.id })
          .from(creditLedger)
          .where(eq(creditLedger.idempotencyKey, input.idempotencyKey))
          .limit(1)

        if (existing) {
          const [balanceRow] = await tx
            .select({ balance: creditBalances.balance })
            .from(creditBalances)
            .where(eq(creditBalances.userId, input.userId))
            .limit(1)
          return { applied: false, reason: 'duplicate', balance: balanceRow?.balance ?? 0 } as const
        }

        let newBalance: number | undefined
        if (input.amount >= 0) {
          const [row] = await tx
            .insert(creditBalances)
            .values({ userId: input.userId, balance: input.amount })
            .onConflictDoUpdate({
              target: creditBalances.userId,
              set: { balance: sql`${creditBalances.balance} + ${input.amount}` },
            })
            .returning({ balance: creditBalances.balance })
          newBalance = row?.balance
        } else {
          const [row] = await tx
            .update(creditBalances)
            .set({ balance: sql`${creditBalances.balance} + ${input.amount}` })
            .where(and(eq(creditBalances.userId, input.userId), sql`${creditBalances.balance} >= ${-input.amount}`))
            .returning({ balance: creditBalances.balance })
          newBalance = row?.balance
        }

        if (newBalance === undefined) {
          const [balanceRow] = await tx
            .select({ balance: creditBalances.balance })
            .from(creditBalances)
            .where(eq(creditBalances.userId, input.userId))
            .limit(1)
          return { applied: false, reason: 'insufficient_credits', balance: balanceRow?.balance ?? 0 } as const
        }

        await tx.insert(creditLedger).values({
          userId: input.userId,
          type: input.type,
          amount: input.amount,
          relatedScanId: input.relatedScanId,
          idempotencyKey: input.idempotencyKey,
        })

        return { applied: true, balance: newBalance } as const
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        const balance = await drizzleCreditsRepository.getBalance(input.userId)
        return { applied: false, reason: 'duplicate', balance }
      }
      throw error
    }
  },

  /**
   * Spans two tables in one transaction: `purchases` (the audit record; its `providerRef` unique
   * constraint is the *primary* defense against Stripe redelivering the same webhook event) plus
   * the same balance-upsert + ledger-insert sequence as `applyLedgerEntry`'s additive branch,
   * keyed by `purchase:{provider}:{providerRef}` as a secondary idempotency backstop.
   */
  async recordPurchaseAndCredit(input) {
    try {
      return await db.transaction(async (tx) => {
        await tx.insert(purchases).values({
          userId: input.userId,
          packType: input.packType,
          creditsGranted: input.creditsGranted,
          amountPaidMinorUnits: input.amountPaidMinorUnits,
          currency: input.currency,
          provider: input.provider,
          providerRef: input.providerRef,
          status: 'completed',
        })

        const [row] = await tx
          .insert(creditBalances)
          .values({ userId: input.userId, balance: input.creditsGranted })
          .onConflictDoUpdate({
            target: creditBalances.userId,
            set: { balance: sql`${creditBalances.balance} + ${input.creditsGranted}` },
          })
          .returning({ balance: creditBalances.balance })

        await tx.insert(creditLedger).values({
          userId: input.userId,
          type: 'purchase',
          amount: input.creditsGranted,
          idempotencyKey: `purchase:${input.provider}:${input.providerRef}`,
        })

        return { granted: true, balance: row!.balance } as const
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        const balance = await drizzleCreditsRepository.getBalance(input.userId)
        return { granted: false, balance }
      }
      throw error
    }
  },
}
