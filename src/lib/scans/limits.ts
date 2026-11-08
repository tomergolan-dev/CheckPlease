export const USER_SCAN_LIMIT = 5
export const USER_SCAN_WINDOW_MS = 10 * 60 * 1000
export const SHARED_SCAN_LIMIT = 100
export const SHARED_SCAN_WINDOW_MS = 24 * 60 * 60 * 1000

export type ScanAttemptStatus = 'processing' | 'succeeded' | 'empty' | 'failed' | 'no_credits'

export interface ScanUsage {
  inputTokens: number
  outputTokens: number
}

/** The operations available while holding the lock that serializes attempt creation. */
export interface ScanAttemptsTransaction {
  attemptExists(scanId: string): Promise<boolean>
  /** Both counts ignore exempt attempts and attempts rejected for lack of credits. */
  countUserAttemptsSince(userId: string, since: Date): Promise<number>
  countSharedAttemptsSince(since: Date): Promise<number>
  insertAttempt(input: { scanId: string; userId: string; exempt: boolean }): Promise<void>
}

export interface ScanAttemptsRepository {
  runExclusive<T>(work: (tx: ScanAttemptsTransaction) => Promise<T>): Promise<T>
  finishAttempt(scanId: string, status: ScanAttemptStatus, usage?: ScanUsage): Promise<void>
}

export type BeginScanResult = { ok: true } | { ok: false; reason: 'duplicate' | 'rate_limited' | 'daily_limit' }

/** Records a new attempt, or says why it may not run. Call before spending credits or API money. */
export function beginScanAttempt(
  input: { scanId: string; userId: string; exempt: boolean },
  repository: ScanAttemptsRepository,
  now: Date = new Date()
): Promise<BeginScanResult> {
  return repository.runExclusive(async (tx) => {
    if (await tx.attemptExists(input.scanId)) return { ok: false, reason: 'duplicate' }

    if (!input.exempt) {
      const userSince = new Date(now.getTime() - USER_SCAN_WINDOW_MS)
      if ((await tx.countUserAttemptsSince(input.userId, userSince)) >= USER_SCAN_LIMIT) {
        return { ok: false, reason: 'rate_limited' }
      }

      const sharedSince = new Date(now.getTime() - SHARED_SCAN_WINDOW_MS)
      if ((await tx.countSharedAttemptsSince(sharedSince)) >= SHARED_SCAN_LIMIT) {
        return { ok: false, reason: 'daily_limit' }
      }
    }

    await tx.insertAttempt(input)
    return { ok: true }
  })
}
