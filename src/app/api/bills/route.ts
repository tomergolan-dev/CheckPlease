import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { listCompletedBills } from '@/lib/bills/list'

/** "My Bills" — every completed bill for the caller, most recently completed first. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const rows = await listCompletedBills(session.user.id)
  return NextResponse.json({
    bills: rows.map((row) => ({ id: row.id, completedAt: row.completedAt.toISOString(), bill: row.data })),
  })
}
