import { NextResponse } from 'next/server'
import { sendVerificationCode } from '@/lib/auth/email-verification'
import { drizzleVerificationCodesRepository, resendVerificationMailer } from '@/lib/auth/email-verification-store'
import { drizzleUserRepository } from '@/lib/auth/register'
import { sendCodeRequestSchema } from '@/lib/auth/verification-requests'

/**
 * "Forgot password": emails a code for choosing a new password. Answers the same for an address
 * with no account (and mails nothing), so it can't be used to learn which emails are registered.
 */
export async function POST(request: Request) {
  const parsed = sendCodeRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const { email, locale } = parsed.data

  const user = await drizzleUserRepository.findByEmail(email)
  if (!user) return NextResponse.json({ ok: true })

  try {
    const result = await sendVerificationCode(
      { email, locale, purpose: 'reset' },
      drizzleVerificationCodesRepository,
      resendVerificationMailer
    )
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 429 })
    }
  } catch (error) {
    console.error('auth/forgot-password: failed to send the reset code', error)
    return NextResponse.json({ error: 'email_failed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
