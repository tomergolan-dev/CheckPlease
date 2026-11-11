import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkVerificationCode,
  CODE_TTL_MS,
  MAX_CODE_ATTEMPTS,
  MAX_SENDS_PER_WINDOW,
  RESEND_COOLDOWN_MS,
  SEND_WINDOW_MS,
  sendAccountExistsNotice,
  sendVerificationCode,
  type VerificationCodeRow,
  type VerificationCodesRepository,
  type VerificationMailer,
} from './email-verification'

function setup() {
  const rows = new Map<string, VerificationCodeRow>()
  const repository: VerificationCodesRepository = {
    async find(email) {
      const row = rows.get(email)
      return row && { ...row }
    },
    async save(row) {
      rows.set(row.email, { ...row })
    },
    async incrementAttempts(email) {
      const row = rows.get(email)
      if (row) row.attempts += 1
    },
    async remove(email) {
      rows.delete(email)
    },
  }
  const sent: Array<{ to: string; code: string }> = []
  const notices: Array<{ to: string; signInEmail: string }> = []
  const mailer: VerificationMailer = {
    async sendCode({ to, code }) {
      sent.push({ to, code })
    },
    async sendAccountExists({ to, signInEmail }) {
      notices.push({ to, signInEmail })
    },
  }
  return { rows, repository, mailer, sent, notices }
}

const EMAIL = 'dana@example.com'
const T0 = new Date('2026-11-10T10:00:00Z')
const later = (ms: number) => new Date(T0.getTime() + ms)

beforeEach(() => {
  vi.stubEnv('AUTH_SECRET', 'test-secret')
})

describe('sending a code', () => {
  it('emails a six-digit code and stores only its hash', async () => {
    const { rows, repository, mailer, sent } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: T0 }, repository, mailer)

    expect(sent).toHaveLength(1)
    expect(sent[0]!.code).toMatch(/^\d{6}$/)
    expect(rows.get(EMAIL)!.codeHash).not.toContain(sent[0]!.code)
  })

  it('waits a minute between sends', async () => {
    const { repository, mailer } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: T0 }, repository, mailer)

    expect(await sendVerificationCode({ email: EMAIL, locale: 'he', now: later(10_000) }, repository, mailer)).toEqual({
      ok: false,
      reason: 'cooldown',
    })
    expect(await sendVerificationCode({ email: EMAIL, locale: 'he', now: later(RESEND_COOLDOWN_MS) }, repository, mailer)).toEqual({
      ok: true,
    })
  })

  it('caps sends per hour, then allows them again', async () => {
    const { repository, mailer } = setup()
    for (let i = 0; i < MAX_SENDS_PER_WINDOW; i++) {
      const result = await sendVerificationCode({ email: EMAIL, locale: 'he', now: later(i * RESEND_COOLDOWN_MS) }, repository, mailer)
      expect(result.ok).toBe(true)
    }
    expect(
      await sendVerificationCode({ email: EMAIL, locale: 'he', now: later(MAX_SENDS_PER_WINDOW * RESEND_COOLDOWN_MS) }, repository, mailer)
    ).toEqual({ ok: false, reason: 'too_many' })
    expect((await sendVerificationCode({ email: EMAIL, locale: 'he', now: later(SEND_WINDOW_MS) }, repository, mailer)).ok).toBe(true)
  })
})

describe('checking a code', () => {
  it('accepts the right code once, then never again', async () => {
    const { repository, mailer } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: T0, code: '123456' }, repository, mailer)

    expect(await checkVerificationCode({ email: EMAIL, code: '123456', now: later(1000) }, repository)).toEqual({ ok: true })
    expect(await checkVerificationCode({ email: EMAIL, code: '123456', now: later(2000) }, repository)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('rejects an expired code', async () => {
    const { repository, mailer } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: T0, code: '123456' }, repository, mailer)

    expect(await checkVerificationCode({ email: EMAIL, code: '123456', now: later(CODE_TTL_MS + 1) }, repository)).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('locks the code after too many wrong tries, even if the right one follows', async () => {
    const { repository, mailer } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: T0, code: '123456' }, repository, mailer)

    for (let i = 0; i < MAX_CODE_ATTEMPTS - 1; i++) {
      expect((await checkVerificationCode({ email: EMAIL, code: '000000', now: T0 }, repository)).ok).toBe(false)
    }
    expect(await checkVerificationCode({ email: EMAIL, code: '000000', now: T0 }, repository)).toEqual({
      ok: false,
      reason: 'too_many_attempts',
    })
    expect(await checkVerificationCode({ email: EMAIL, code: '123456', now: T0 }, repository)).toEqual({
      ok: false,
      reason: 'too_many_attempts',
    })
  })

  it("doesn't accept a code sent to another address", async () => {
    const { repository, mailer } = setup()
    await sendVerificationCode({ email: 'other@example.com', locale: 'he', now: T0, code: '123456' }, repository, mailer)

    expect((await checkVerificationCode({ email: EMAIL, code: '123456', now: T0 }, repository)).ok).toBe(false)
  })

  it('a new code replaces the old one', async () => {
    const { repository, mailer } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: T0, code: '111111' }, repository, mailer)
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: later(RESEND_COOLDOWN_MS), code: '222222' }, repository, mailer)

    expect((await checkVerificationCode({ email: EMAIL, code: '111111', now: later(RESEND_COOLDOWN_MS) }, repository)).ok).toBe(false)
    expect((await checkVerificationCode({ email: EMAIL, code: '222222', now: later(RESEND_COOLDOWN_MS) }, repository)).ok).toBe(true)
  })
})

describe('the account-exists notice', () => {
  const NOTICE = { email: EMAIL, signInEmail: EMAIL, locale: 'he' as const, appUrl: 'https://example.com' }

  it('emails the notice, and no code that could be typed', async () => {
    const { repository, mailer, sent, notices } = setup()

    expect(await sendAccountExistsNotice({ ...NOTICE, now: T0 }, repository, mailer)).toEqual({ ok: true })
    expect(notices).toEqual([{ to: EMAIL, signInEmail: EMAIL }])
    expect(sent).toEqual([])
    expect((await checkVerificationCode({ email: EMAIL, code: '000000', now: T0 }, repository)).ok).toBe(false)
  })

  it('keeps a pending code working, so a sign-up attempt can never cancel a password reset', async () => {
    const { repository, mailer } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', purpose: 'reset', now: T0, code: '123456' }, repository, mailer)
    await sendAccountExistsNotice({ ...NOTICE, now: later(RESEND_COOLDOWN_MS) }, repository, mailer)

    expect((await checkVerificationCode({ email: EMAIL, code: '123456', now: later(RESEND_COOLDOWN_MS) }, repository)).ok).toBe(true)
  })

  it('shares the sending limits with codes', async () => {
    const { repository, mailer, notices } = setup()
    await sendVerificationCode({ email: EMAIL, locale: 'he', now: T0 }, repository, mailer)

    expect(await sendAccountExistsNotice({ ...NOTICE, now: later(1000) }, repository, mailer)).toEqual({ ok: false, reason: 'cooldown' })
    expect(notices).toEqual([])
  })
})
