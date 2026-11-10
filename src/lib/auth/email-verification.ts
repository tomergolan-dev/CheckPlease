import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * Six-digit email codes that prove a new email/password account owns its address (see "Email
 * verification" in CLAUDE.md). Codes are stored only as an HMAC, expire, and allow a few tries;
 * sending is rate-limited per address. Storage, mail and time are injected for testing.
 */

export const CODE_TTL_MS = 15 * 60 * 1000
export const MAX_CODE_ATTEMPTS = 5
export const RESEND_COOLDOWN_MS = 60 * 1000
export const SEND_WINDOW_MS = 60 * 60 * 1000
export const MAX_SENDS_PER_WINDOW = 5

export type VerificationLocale = 'he' | 'en'

export interface VerificationCodeRow {
  email: string
  codeHash: string
  expiresAt: Date
  attempts: number
  lastSentAt: Date
  windowStartedAt: Date
  sendsInWindow: number
}

export interface VerificationCodesRepository {
  find(email: string): Promise<VerificationCodeRow | undefined>
  save(row: VerificationCodeRow): Promise<void>
  incrementAttempts(email: string): Promise<void>
  remove(email: string): Promise<void>
}

export interface VerificationMailer {
  sendCode(input: { to: string; code: string; locale: VerificationLocale }): Promise<void>
}

export type SendCodeResult = { ok: true } | { ok: false; reason: 'cooldown' | 'too_many' }
export type CheckCodeResult = { ok: true } | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' }

function hashCode(email: string, code: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is required to hash verification codes')
  return createHmac('sha256', secret).update(`${email}:${code}`).digest('hex')
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/** Creates a fresh code (replacing any earlier one) and emails it, within the sending limits. */
export async function sendVerificationCode(
  input: { email: string; locale: VerificationLocale; now?: Date; code?: string },
  repository: VerificationCodesRepository,
  mailer: VerificationMailer
): Promise<SendCodeResult> {
  const now = input.now ?? new Date()
  const existing = await repository.find(input.email)

  if (existing && now.getTime() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: 'cooldown' }
  }

  const windowOpen = existing && now.getTime() - existing.windowStartedAt.getTime() < SEND_WINDOW_MS
  const sendsInWindow = windowOpen ? existing.sendsInWindow : 0
  if (sendsInWindow >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, reason: 'too_many' }
  }

  const code = input.code ?? generateCode()
  await repository.save({
    email: input.email,
    codeHash: hashCode(input.email, code),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    attempts: 0,
    lastSentAt: now,
    windowStartedAt: windowOpen ? existing.windowStartedAt : now,
    sendsInWindow: sendsInWindow + 1,
  })
  await mailer.sendCode({ to: input.email, code, locale: input.locale })
  return { ok: true }
}

/** Checks a typed code. A correct one is consumed, so it can never be used twice. */
export async function checkVerificationCode(
  input: { email: string; code: string; now?: Date },
  repository: VerificationCodesRepository
): Promise<CheckCodeResult> {
  const now = input.now ?? new Date()
  const row = await repository.find(input.email)
  if (!row) return { ok: false, reason: 'invalid' }
  if (row.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' }
  if (now.getTime() > row.expiresAt.getTime()) return { ok: false, reason: 'expired' }

  const expected = Buffer.from(row.codeHash, 'hex')
  const actual = Buffer.from(hashCode(input.email, input.code.trim()), 'hex')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await repository.incrementAttempts(input.email)
    return { ok: false, reason: row.attempts + 1 >= MAX_CODE_ATTEMPTS ? 'too_many_attempts' : 'invalid' }
  }

  await repository.remove(input.email)
  return { ok: true }
}
