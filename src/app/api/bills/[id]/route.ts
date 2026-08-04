import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { discardServerDraft } from '@/lib/bills/discard'

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
