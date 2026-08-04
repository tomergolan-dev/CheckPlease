import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { syncDraft } from '@/lib/bills/sync'
import { syncRequestSchema } from '@/lib/bills/validation'

/**
 * Bidirectional — the one `/api/bills/sync` route CLAUDE.md names for draft sync. A `bill`
 * present in the body pushes it as the caller's active draft; `bill: null` pulls whatever draft
 * the caller already has in the cloud (or null). There is deliberately no separate GET-draft
 * route.
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

  const parsed = syncRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // `status` is optional in the request schema (see validation.ts) since it's never trusted
  // server-side — the client always sends 'draft' in practice (a completed bill's push is
  // already rejected by upsertDraft's ownership+status guard regardless of what's in the blob),
  // this default only exists to satisfy the stricter local `Bill` type.
  const bill = parsed.data.bill ? { ...parsed.data.bill, status: parsed.data.bill.status ?? ('draft' as const) } : null
  const result = await syncDraft(session.user.id, bill)

  if (result.action === 'push_rejected') {
    return NextResponse.json({ error: 'conflict' }, { status: 409 })
  }
  if (result.action === 'pushed') {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ bill: result.bill })
}
