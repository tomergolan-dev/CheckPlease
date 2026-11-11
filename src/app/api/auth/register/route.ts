import { NextResponse } from 'next/server'
import { sendAccountExistsNotice, sendVerificationCode } from '@/lib/auth/email-verification'
import { drizzleVerificationCodesRepository, resendVerificationMailer } from '@/lib/auth/email-verification-store'
import { EmailAlreadyRegisteredError, registerUser } from '@/lib/auth/register'
import { registerInputSchema } from '@/lib/auth/validation'
import { localeFrom } from '@/lib/auth/verification-requests'

/**
 * Creates an unverified email/password account and emails it a six-digit code. The account can't
 * sign in, and gets no free scans, until POST /api/auth/verify-email accepts that code.
 *
 * An address that already has an account gets the very same response, so this form can't be used
 * to learn who is registered; that mailbox is emailed "you already have an account" instead.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = registerInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }
  const locale = localeFrom(body && typeof body === 'object' && 'locale' in body ? body.locale : undefined)
  const email = parsed.data.email

  try {
    const user = await registerUser(parsed.data).catch((error: unknown) => {
      if (error instanceof EmailAlreadyRegisteredError) return error
      throw error
    })
    // Limits (cooldown, too many) are deliberately not reported: a code that went out moments ago
    // still works, and reporting them for a taken address would tell the two cases apart.
    if (user instanceof EmailAlreadyRegisteredError) {
      await sendAccountExistsNotice(
        { email, signInEmail: user.signInEmail, locale, appUrl: new URL(request.url).origin },
        drizzleVerificationCodesRepository,
        resendVerificationMailer
      )
    } else {
      await sendVerificationCode({ email: user.email, locale }, drizzleVerificationCodesRepository, resendVerificationMailer)
    }
  } catch (error) {
    console.error('auth/register: failed to send the sign-up email', error)
    return NextResponse.json({ error: 'email_failed' }, { status: 502 })
  }

  return NextResponse.json({ status: 'verification_required' }, { status: 201 })
}
