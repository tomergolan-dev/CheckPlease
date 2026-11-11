import { NextResponse } from 'next/server'
import { sendVerificationCode } from '@/lib/auth/email-verification'
import { drizzleVerificationCodesRepository, resendVerificationMailer } from '@/lib/auth/email-verification-store'
import { drizzleUserRepository, isUnverifiedPasswordAccount } from '@/lib/auth/register'
import { sendCodeRequestSchema } from '@/lib/auth/verification-requests'

/**
 * Sends a fresh code to an account that hasn't verified yet ("Send a new code", or signing in
 * before verifying). Answers the same way for any other address, so it can't be used to learn
 * which emails have accounts, and never mails an address that has nothing to verify.
 */
export async function POST(request: Request) {
  const parsed = sendCodeRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const { email, locale } = parsed.data

  const user = await drizzleUserRepository.findByEmail(email)
  if (!user || !isUnverifiedPasswordAccount(user)) {
    return NextResponse.json({ ok: true })
  }

  try {
    const result = await sendVerificationCode({ email, locale }, drizzleVerificationCodesRepository, resendVerificationMailer)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 429 })
    }
  } catch (error) {
    console.error('auth/send-code: failed to send the verification code', error)
    return NextResponse.json({ error: 'email_failed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
