import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { completeBill } from '@/lib/bills/complete'

/** The one-way draft → completed transition ("Confirm payment" / restart's "Save to My Bills"). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const result = await completeBill(session.user.id, id)

  if (!result.ok) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ bill: result.data })
}
