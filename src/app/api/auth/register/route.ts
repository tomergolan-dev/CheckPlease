import { NextResponse } from 'next/server'
import { sendVerificationCode } from '@/lib/auth/email-verification'
import { drizzleVerificationCodesRepository, resendVerificationMailer } from '@/lib/auth/email-verification-store'
import { EmailAlreadyRegisteredError, registerUser } from '@/lib/auth/register'
import { registerInputSchema } from '@/lib/auth/validation'
import { localeFrom } from '@/lib/auth/verification-requests'

/**
 * Creates an unverified email/password account and emails it a six-digit code. The account can't
 * sign in, and gets no free scans, until POST /api/auth/verify-email accepts that code.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = registerInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  let user
  try {
    user = await registerUser(parsed.data)
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }
    throw error
  }

  const locale = localeFrom(body && typeof body === 'object' && 'locale' in body ? body.locale : undefined)
  try {
    // A cooldown here means a code was sent moments ago (signing up twice in a row); that code
    // still works, so the client moves on to the code screen either way.
    await sendVerificationCode({ email: user.email, locale }, drizzleVerificationCodesRepository, resendVerificationMailer)
  } catch (error) {
    console.error('auth/register: failed to send the verification code', error)
    return NextResponse.json({ error: 'email_failed' }, { status: 502 })
  }

  return NextResponse.json({ status: 'verification_required' }, { status: 201 })
}
