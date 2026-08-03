import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCreditBalance } from '@/lib/credits/reserve'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const balance = await getCreditBalance(session.user.id)
  return NextResponse.json({ balance })
}
