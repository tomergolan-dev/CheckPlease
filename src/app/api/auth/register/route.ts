import { NextResponse } from 'next/server'
import { EmailAlreadyRegisteredError, registerUser } from '@/lib/auth/register'
import { registerInputSchema } from '@/lib/auth/validation'

/**
 * Server-side foundation for email/password registration — the Credentials provider itself
 * (see src/lib/auth/config.ts) only verifies existing credentials at sign-in, it doesn't create
 * accounts. There's no product-facing sign-up screen yet (see CLAUDE.md's Post-MVP Architecture
 * — that's Phase 2); this route exists so the infrastructure can be exercised end-to-end now.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = registerInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  try {
    const user = await registerUser(parsed.data)
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }
    throw error
  }
}
