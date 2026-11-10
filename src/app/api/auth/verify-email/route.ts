import { NextResponse } from 'next/server'
import { checkVerificationCode } from '@/lib/auth/email-verification'
import { drizzleVerificationCodesRepository } from '@/lib/auth/email-verification-store'
import { verifyRegisteredEmail } from '@/lib/auth/register'
import { verifyEmailRequestSchema } from '@/lib/auth/verification-requests'

/** Accepts the emailed code: the account becomes verified and gets its free scans. */
export async function POST(request: Request) {
  const parsed = verifyEmailRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  const { email, code } = parsed.data

  const checked = await checkVerificationCode({ email, code }, drizzleVerificationCodesRepository)
  if (!checked.ok) {
    return NextResponse.json({ error: checked.reason }, { status: 400 })
  }

  const verified = await verifyRegisteredEmail(email)
  if (!verified.ok) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
