import { and, count, eq, gte, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { scanAttempts } from '@/lib/db/schema'
import type { ScanAttemptsRepository } from './limits'

/** Arbitrary constant identifying this lock among any other Postgres advisory locks. */
const SCAN_ATTEMPTS_LOCK_ID = 7_240_115

const countsTowardLimits = and(eq(scanAttempts.exempt, false), ne(scanAttempts.status, 'no_credits'))

export const drizzleScanAttemptsRepository: ScanAttemptsRepository = {
  /**
   * The lock makes check-then-insert atomic, so simultaneous requests can't all pass a limit check
   * on the same count. It's held only for these few short queries, never during the model call.
   */
  runExclusive(work) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${SCAN_ATTEMPTS_LOCK_ID})`)

      return work({
        async attemptExists(scanId) {
          const [row] = await tx
            .select({ scanId: scanAttempts.scanId })
            .from(scanAttempts)
            .where(eq(scanAttempts.scanId, scanId))
            .limit(1)
          return row !== undefined
        },

        async countUserAttemptsSince(userId, since) {
          const [row] = await tx
            .select({ value: count() })
            .from(scanAttempts)
            .where(and(eq(scanAttempts.userId, userId), gte(scanAttempts.createdAt, since), countsTowardLimits))
          return row?.value ?? 0
        },

        async countSharedAttemptsSince(since) {
          const [row] = await tx
            .select({ value: count() })
            .from(scanAttempts)
            .where(and(gte(scanAttempts.createdAt, since), countsTowardLimits))
          return row?.value ?? 0
        },

        async insertAttempt({ scanId, userId, exempt }) {
          await tx.insert(scanAttempts).values({ scanId, userId, exempt })
        },
      })
    })
  },

  async finishAttempt(scanId, status, usage) {
    await db
      .update(scanAttempts)
      .set({ status, inputTokens: usage?.inputTokens, outputTokens: usage?.outputTokens })
      .where(eq(scanAttempts.scanId, scanId))
  },
}
