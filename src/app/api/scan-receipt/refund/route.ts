import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { refundCredit } from '@/lib/credits/reserve'
import { hasUnlimitedCredits } from '@/lib/credits/dev-override'

/**
 * Client-triggered refund for a scan session being abandoned mid-flow ("Retake photo" / "Try
 * again" — see abandonScan in receipt-scan.ts), as opposed to the automatic server-side refunds
 * that already happen on a hard failure or zero usable items within POST /api/scan-receipt
 * itself. Idempotent per scanId (see refundCredit) — calling this for a session that was already
 * auto-refunded, or never reserved at all, is a safe no-op either way.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const { scanId } = (body ?? {}) as { scanId?: unknown }
  if (typeof scanId !== 'string' || scanId.length === 0) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // Dev/demo-only allowlist override — mirrors scan-receipt/route.ts (see dev-override.ts). An
  // allowlisted user's scans never call reserveCredit in the first place, so refunding here would
  // create a phantom +1 that was never actually deducted, silently inflating their balance.
  if (!hasUnlimitedCredits(session.user.email)) {
    await refundCredit(session.user.id, scanId)
  }

  return NextResponse.json({ ok: true })
}
