import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { discardServerDraft } from '@/lib/bills/discard'
import { renameCompletedBill } from '@/lib/bills/rename'
import { renameRequestSchema } from '@/lib/bills/validation'

/** Permanently deletes the caller's server-side draft row (restart flow's "Discard"). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await discardServerDraft(session.user.id, id)

  if (!result.ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

/** Renames a completed bill's title — the one exception to "My Bills" being read-only. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = renameRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const { id } = await params
  const result = await renameCompletedBill(session.user.id, id, parsed.data.restaurantName)

  if (!result.ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ bill: result.data })
}
