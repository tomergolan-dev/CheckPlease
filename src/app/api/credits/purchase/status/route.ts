import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { findPurchasedCredits } from '@/lib/credits/repository'

/**
 * Read-only: reports whether the webhook has recorded this purchase for the signed-in user. It
 * never grants anything, and another user's session id looks the same as one not recorded yet.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sessionId = new URL(request.url).searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const credits = await findPurchasedCredits(session.user.id, sessionId)
  return NextResponse.json(credits === null ? { status: 'pending' } : { status: 'granted', credits })
}
