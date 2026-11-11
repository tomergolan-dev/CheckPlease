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

/** What the code is for; only the email's wording differs. Either way it proves the mailbox. */
export type CodePurpose = 'verify' | 'reset'

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
  sendCode(input: { to: string; code: string; locale: VerificationLocale; purpose: CodePurpose }): Promise<void>
  /** "You already have an account": sent instead of a code when someone signs up with a taken address. */
  sendAccountExists(input: { to: string; signInEmail: string; locale: VerificationLocale; appUrl: string }): Promise<void>
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

/** The sending limits, shared by codes and the account-exists notice. */
function checkSendLimits(existing: VerificationCodeRow | undefined, now: Date) {
  if (existing && now.getTime() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false as const, reason: 'cooldown' as const }
  }
  const windowOpen = existing !== undefined && now.getTime() - existing.windowStartedAt.getTime() < SEND_WINDOW_MS
  const sendsInWindow = windowOpen ? existing.sendsInWindow : 0
  if (sendsInWindow >= MAX_SENDS_PER_WINDOW) return { ok: false as const, reason: 'too_many' as const }
  return { ok: true as const, windowStartedAt: windowOpen ? existing.windowStartedAt : now, sendsInWindow: sendsInWindow + 1 }
}

/**
 * Someone signed up with an address that already has an account. They see the usual code screen,
 * so the sign-up form never reveals which emails are registered; the mailbox's owner gets this
 * notice instead of a code. Any pending code (e.g. a password reset) is left working.
 */
export async function sendAccountExistsNotice(
  input: { email: string; signInEmail: string; locale: VerificationLocale; appUrl: string; now?: Date },
  repository: VerificationCodesRepository,
  mailer: VerificationMailer
): Promise<SendCodeResult> {
  const now = input.now ?? new Date()
  const existing = await repository.find(input.email)
  const limits = checkSendLimits(existing, now)
  if (!limits.ok) return limits

  await repository.save({
    email: input.email,
    // No row yet: an empty hash never matches any typed code, and it's already expired.
    codeHash: existing?.codeHash ?? '',
    expiresAt: existing?.expiresAt ?? now,
    attempts: existing?.attempts ?? 0,
    lastSentAt: now,
    windowStartedAt: limits.windowStartedAt,
    sendsInWindow: limits.sendsInWindow,
  })
  await mailer.sendAccountExists({ to: input.email, signInEmail: input.signInEmail, locale: input.locale, appUrl: input.appUrl })
  return { ok: true }
}

/** Creates a fresh code (replacing any earlier one) and emails it, within the sending limits. */
export async function sendVerificationCode(
  input: { email: string; locale: VerificationLocale; purpose?: CodePurpose; now?: Date; code?: string },
  repository: VerificationCodesRepository,
  mailer: VerificationMailer
): Promise<SendCodeResult> {
  const now = input.now ?? new Date()
  const existing = await repository.find(input.email)
  const limits = checkSendLimits(existing, now)
  if (!limits.ok) return limits

  const code = input.code ?? generateCode()
  await repository.save({
    email: input.email,
    codeHash: hashCode(input.email, code),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    attempts: 0,
    lastSentAt: now,
    windowStartedAt: limits.windowStartedAt,
    sendsInWindow: limits.sendsInWindow,
  })
  await mailer.sendCode({ to: input.email, code, locale: input.locale, purpose: input.purpose ?? 'verify' })
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
