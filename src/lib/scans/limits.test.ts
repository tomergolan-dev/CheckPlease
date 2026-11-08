import { describe, expect, it } from 'vitest'
import {
  beginScanAttempt,
  SHARED_SCAN_LIMIT,
  SHARED_SCAN_WINDOW_MS,
  USER_SCAN_LIMIT,
  USER_SCAN_WINDOW_MS,
  type ScanAttemptsRepository,
  type ScanAttemptStatus,
} from './limits'

const NOW = new Date('2026-11-08T12:00:00Z')

interface FakeAttempt {
  scanId: string
  userId: string
  exempt: boolean
  status: ScanAttemptStatus
  createdAt: Date
}

function createFakeRepository(seed: FakeAttempt[] = []) {
  const attempts = [...seed]
  const countable = (attempt: FakeAttempt, since: Date) =>
    !attempt.exempt && attempt.status !== 'no_credits' && attempt.createdAt >= since

  // Calls queue behind one another, mirroring the database lock used by the real repository.
  let queue: Promise<unknown> = Promise.resolve()

  const repository: ScanAttemptsRepository = {
    runExclusive(work) {
      const result = queue.then(() =>
        work({
          attemptExists: async (scanId) => attempts.some((attempt) => attempt.scanId === scanId),
          countUserAttemptsSince: async (userId, since) =>
            attempts.filter((attempt) => attempt.userId === userId && countable(attempt, since)).length,
          countSharedAttemptsSince: async (since) => attempts.filter((attempt) => countable(attempt, since)).length,
          insertAttempt: async ({ scanId, userId, exempt }) => {
            attempts.push({ scanId, userId, exempt, status: 'processing', createdAt: NOW })
          },
        })
      )
      queue = result.catch(() => undefined)
      return result
    },
    async finishAttempt(scanId, status) {
      const attempt = attempts.find((candidate) => candidate.scanId === scanId)
      if (attempt) attempt.status = status
    },
  }

  return { repository, attempts }
}

function seedAttempts(total: number, userId: (index: number) => string, createdAt: Date): FakeAttempt[] {
  return Array.from({ length: total }, (_, index) => ({
    scanId: `seed-${index}`,
    userId: userId(index),
    exempt: false,
    status: 'succeeded' as const,
    createdAt,
  }))
}

const begin = (repository: ScanAttemptsRepository, scanId: string, userId = 'u1', exempt = false) =>
  beginScanAttempt({ scanId, userId, exempt }, repository, NOW)

describe('beginScanAttempt', () => {
  it('records a new attempt as processing', async () => {
    const { repository, attempts } = createFakeRepository()

    expect(await begin(repository, 'scan-1')).toEqual({ ok: true })
    expect(attempts).toHaveLength(1)
    expect(attempts[0]).toMatchObject({ scanId: 'scan-1', userId: 'u1', status: 'processing', exempt: false })
  })

  it('rejects a scan id that already ran, even for a different user', async () => {
    const { repository, attempts } = createFakeRepository()
    await begin(repository, 'scan-1', 'u1')

    expect(await begin(repository, 'scan-1', 'u1')).toEqual({ ok: false, reason: 'duplicate' })
    expect(await begin(repository, 'scan-1', 'u2')).toEqual({ ok: false, reason: 'duplicate' })
    expect(attempts).toHaveLength(1)
  })

  it('rejects a duplicate from an exempt account too', async () => {
    const { repository } = createFakeRepository()
    await begin(repository, 'scan-1', 'me', true)

    expect(await begin(repository, 'scan-1', 'me', true)).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('allows a user up to the limit, then rate limits them', async () => {
    const { repository } = createFakeRepository(seedAttempts(USER_SCAN_LIMIT - 1, () => 'u1', NOW))

    expect(await begin(repository, 'last-allowed')).toEqual({ ok: true })
    expect(await begin(repository, 'over-limit')).toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('does not count attempts older than the user window', async () => {
    const old = new Date(NOW.getTime() - USER_SCAN_WINDOW_MS - 1)
    const { repository } = createFakeRepository(seedAttempts(USER_SCAN_LIMIT, () => 'u1', old))

    expect(await begin(repository, 'scan-1')).toEqual({ ok: true })
  })

  it("does not let one user's attempts rate limit another user", async () => {
    const { repository } = createFakeRepository(seedAttempts(USER_SCAN_LIMIT, () => 'u1', NOW))

    expect(await begin(repository, 'scan-1', 'u2')).toEqual({ ok: true })
  })

  it('counts failed attempts, since they still cost API money', async () => {
    const seed = seedAttempts(USER_SCAN_LIMIT, () => 'u1', NOW).map((attempt) => ({
      ...attempt,
      status: 'failed' as const,
    }))
    const { repository } = createFakeRepository(seed)

    expect(await begin(repository, 'scan-1')).toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('ignores attempts rejected for lack of credits, since they never reached the model', async () => {
    const seed = seedAttempts(USER_SCAN_LIMIT, () => 'u1', NOW).map((attempt) => ({
      ...attempt,
      status: 'no_credits' as const,
    }))
    const { repository } = createFakeRepository(seed)

    expect(await begin(repository, 'scan-1')).toEqual({ ok: true })
  })

  it('enforces the shared cap across all users', async () => {
    const seed = seedAttempts(SHARED_SCAN_LIMIT, (index) => `user-${index}`, NOW)
    const { repository } = createFakeRepository(seed)

    expect(await begin(repository, 'scan-1', 'new-user')).toEqual({ ok: false, reason: 'daily_limit' })
  })

  it('does not count attempts older than the shared window', async () => {
    const old = new Date(NOW.getTime() - SHARED_SCAN_WINDOW_MS - 1)
    const seed = seedAttempts(SHARED_SCAN_LIMIT, (index) => `user-${index}`, old)
    const { repository } = createFakeRepository(seed)

    expect(await begin(repository, 'scan-1', 'new-user')).toEqual({ ok: true })
  })

  it('never limits an exempt account, and still records its attempts', async () => {
    const seed = seedAttempts(SHARED_SCAN_LIMIT, () => 'me', NOW)
    const { repository, attempts } = createFakeRepository(seed)

    expect(await begin(repository, 'scan-1', 'me', true)).toEqual({ ok: true })
    expect(attempts.find((attempt) => attempt.scanId === 'scan-1')?.exempt).toBe(true)
  })

  it('does not count exempt attempts toward anyone else’s limits', async () => {
    const seed = seedAttempts(SHARED_SCAN_LIMIT, () => 'me', NOW).map((attempt) => ({ ...attempt, exempt: true }))
    const { repository } = createFakeRepository(seed)

    expect(await begin(repository, 'scan-1', 'u1')).toEqual({ ok: true })
  })

  it('never lets simultaneous requests exceed the user limit', async () => {
    const { repository, attempts } = createFakeRepository()

    const results = await Promise.all(
      Array.from({ length: USER_SCAN_LIMIT + 5 }, (_, index) => begin(repository, `scan-${index}`))
    )

    expect(results.filter((result) => result.ok)).toHaveLength(USER_SCAN_LIMIT)
    expect(attempts).toHaveLength(USER_SCAN_LIMIT)
  })
})
