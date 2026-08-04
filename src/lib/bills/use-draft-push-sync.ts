'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useBillStore } from '@/lib/store/bill-store'

const DEBOUNCE_MS = 3000

/**
 * Pushes the active draft to the cloud a few seconds after any edit (debounced) — see "The
 * active draft" in CLAUDE.md's Cross-device sync and bill history section. Mounted once,
 * unconditionally, in BillEntry (not inside BillCanvas) so it's never torn down as `bill` flips
 * null/non-null — a conditional mount would lose this ref and could cause spurious pushes on
 * remount.
 */
export function useDraftPushSync(): void {
  const bill = useBillStore((s) => s.bill)
  const { status } = useSession()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (status !== 'authenticated' || !bill || bill.status !== 'draft') return

    const billId = bill.id
    timeoutRef.current = setTimeout(() => {
      // Re-read live state at fire time, not the closed-over `bill` — the guard against firing
      // during the window between a local restart/complete/discard and its server-side
      // resolution: if the bill has since changed id, been discarded (null), or completed, this
      // is a stale timer and must no-op rather than push.
      const current = useBillStore.getState().bill
      if (!current || current.id !== billId || current.status !== 'draft') return
      void fetch('/api/bills/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill: current }),
      })
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [bill, status])
}
