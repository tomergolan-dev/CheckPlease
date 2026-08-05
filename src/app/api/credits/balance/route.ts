import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCreditBalance } from '@/lib/credits/reserve'
import { hasUnlimitedCredits } from '@/lib/credits/dev-override'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const balance = await getCreditBalance(session.user.id)
  // `unlimited` is purely a display hint for the dev/demo allowlist (see dev-override.ts) — the
  // real balance is still returned as-is underneath, since it's genuinely never touched for that
  // account (no reserve/refund ledger rows are ever created for it).
  return NextResponse.json({ balance, unlimited: hasUnlimitedCredits(session.user.email) })
}
