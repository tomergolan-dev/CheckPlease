import type { CreditsRepository, GrantPurchaseInput, GrantPurchaseResult } from './repository'
import type { ApplyLedgerResult, CreditLedgerType, LedgerEntryInput } from './types'

export interface FakeLedgerEntry {
  userId: string
  type: CreditLedgerType
  amount: number
  idempotencyKey: string
}

/**
 * A stateful in-memory fake `CreditsRepository`, for unit-testing reserve.ts/grants.ts without a
 * live Postgres connection — same spirit as src/lib/auth/register.test.ts's fakes, but stateful
 * (a real `Map` balance + ledger array) since these tests exercise *sequences* of calls, not one
 * call in isolation.
 *
 * Each method has exactly one `await` — right at the top, before any read. Everything after that
 * point runs synchronously to completion. This is deliberate: it's what makes `Promise.all`-driven
 * "concurrent" calls in tests actually interleave the way concurrent DB transactions do — each
 * call yields once (letting other queued calls also reach their own read), then the microtask
 * queue resumes them one at a time, and since nothing after the yield ever awaits again, each
 * resumed call's read-check-write runs as one atomic block before the next call gets a turn —
 * mirroring how a real transaction's row lock serializes concurrent writers. A second yield point
 * partway through would let multiple calls read a stale balance before any of them writes,
 * making a "never goes negative" test pass vacuously.
 */
export function createInMemoryCreditsRepository(): {
  repository: CreditsRepository
  getLedgerEntries: () => FakeLedgerEntry[]
} {
  const balances = new Map<string, number>()
  const ledger: FakeLedgerEntry[] = []
  const providerRefs = new Set<string>()

  const repository: CreditsRepository = {
    async getBalance(userId) {
      return balances.get(userId) ?? 0
    },

    async applyLedgerEntry(input: LedgerEntryInput): Promise<ApplyLedgerResult> {
      await Promise.resolve()

      const existing = ledger.find((entry) => entry.idempotencyKey === input.idempotencyKey)
      if (existing) {
        return { applied: false, reason: 'duplicate', balance: balances.get(input.userId) ?? 0 }
      }

      const current = balances.get(input.userId) ?? 0
      const next = current + input.amount
      if (next < 0) {
        return { applied: false, reason: 'insufficient_credits', balance: current }
      }

      balances.set(input.userId, next)
      ledger.push({
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
      })
      return { applied: true, balance: next }
    },

    async recordPurchaseAndCredit(input: GrantPurchaseInput): Promise<GrantPurchaseResult> {
      await Promise.resolve()

      if (providerRefs.has(input.providerRef)) {
        return { granted: false, balance: balances.get(input.userId) ?? 0 }
      }

      providerRefs.add(input.providerRef)
      const current = balances.get(input.userId) ?? 0
      const next = current + input.creditsGranted
      balances.set(input.userId, next)
      ledger.push({
        userId: input.userId,
        type: 'purchase',
        amount: input.creditsGranted,
        idempotencyKey: `purchase:${input.provider}:${input.providerRef}`,
      })
      return { granted: true, balance: next }
    },
  }

  return { repository, getLedgerEntries: () => [...ledger] }
}
