import { NextResponse } from 'next/server'
import { checkVerificationCode } from '@/lib/auth/email-verification'
import { drizzleVerificationCodesRepository } from '@/lib/auth/email-verification-store'
import { resetPassword } from '@/lib/auth/reset-password'
import { resetPasswordRequestSchema } from '@/lib/auth/verification-requests'

/** Accepts the emailed code together with the new password, and saves it. */
export async function POST(request: Request) {
  const parsed = resetPasswordRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  const { email, code, password } = parsed.data

  const checked = await checkVerificationCode({ email, code }, drizzleVerificationCodesRepository)
  if (!checked.ok) {
    return NextResponse.json({ error: checked.reason }, { status: 400 })
  }

  const result = await resetPassword({ email, password })
  if (!result.ok) {
    return NextResponse.json({ error: result.reason === 'email_taken' ? 'email_taken' : 'invalid' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
