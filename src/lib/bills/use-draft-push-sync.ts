'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useBillStore } from '@/lib/store/bill-store'
import type { Bill } from './types'

const DEBOUNCE_MS = 3000

type PushResponse = { ok: true; id: string; data: Bill } | { error: string }

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

      fetch('/api/bills/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill: current }),
      })
        .then((res) => (res.ok ? (res.json() as Promise<PushResponse>) : null))
        .then((result) => {
          if (!result || !('ok' in result) || !result.ok) return

          // Same staleness guard as above, re-checked after the round trip: only reconcile the
          // draft we actually just pushed, never one the user has since restarted/completed.
          const live = useBillStore.getState().bill
          if (!live || live.id !== billId || live.status !== 'draft') return

          // The server's canonical draft can differ in id (this account's one true cloud draft
          // already lived under a different id — see upsertDraft in repository.ts) and/or in
          // data (a losing side of that same merge). Adopting the id is always safe and always
          // needed, so future pushes land on the right row; adopting the *data* is only safe
          // when it's actually newer than what's live now — otherwise a fresher edit made while
          // this request was in flight would be silently discarded. When the id changed but our
          // live data is newer, keep the live data and just relabel it with the canonical id —
          // the next debounced push (triggered by this very state change) re-pushes it under
          // that id and wins the merge there, since it's genuinely the newer side.
          if (result.id !== live.id) {
            const winner: Bill = live.updatedAt > result.data.updatedAt ? { ...live, id: result.id } : result.data
            useBillStore.getState().loadBill(winner)
          } else if (result.data.updatedAt > live.updatedAt) {
            useBillStore.getState().loadBill(result.data)
          }
        })
        .catch(() => {})
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [bill, status])
}
