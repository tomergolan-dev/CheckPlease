'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useBillStore } from '@/lib/store/bill-store'
import { useIsBillStoreHydrated } from '@/lib/store/hydrate-bill-store'
import type { Bill } from './types'

export interface ActiveDraftState {
  /** False while hydration and (for a signed-in user with no local bill) the cloud check are
   * still pending — callers should render a boot state until this is true. */
  resolved: boolean
  draft: Bill | null
  draftSource: 'local' | 'cloud' | null
}

/**
 * Resolves "does an active draft exist, and where does it live" — see the App launch / home-screen
 * behavior rule in CLAUDE.md's Cross-device sync and bill history section. A local draft, when
 * present, always wins and short-circuits before the cloud is ever consulted — the cloud is only
 * ever checked when local storage is empty (the "second device" scenario the spec calls out).
 * This is the concrete implementation of that "local always wins, no conflict UI" design.
 *
 * The cloud-pulled draft is held in transient React state here, never written into the persisted
 * Zustand store — it only enters the store via the `loadBill` action, and only when the user
 * actually taps "Continue." Mounted once in BillEntry, alongside useDraftPushSync.
 */
export function useActiveDraft(): ActiveDraftState {
  const hasHydrated = useIsBillStoreHydrated()
  const localBill = useBillStore((s) => s.bill)
  const { status } = useSession()
  const [pulledBill, setPulledBill] = useState<Bill | null>(null)
  const [cloudChecked, setCloudChecked] = useState(false)

  const needsCloudCheck = hasHydrated && !localBill && status === 'authenticated'

  useEffect(() => {
    if (!needsCloudCheck || cloudChecked) return
    let cancelled = false
    fetch('/api/bills/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bill: null }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { bill: Bill | null } | null) => {
        if (cancelled) return
        setPulledBill(data?.bill ?? null)
        setCloudChecked(true)
      })
      .catch(() => {
        if (!cancelled) setCloudChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [needsCloudCheck, cloudChecked])

  if (!hasHydrated) return { resolved: false, draft: null, draftSource: null }
  if (localBill) return { resolved: true, draft: localBill, draftSource: 'local' }
  if (status === 'loading') return { resolved: false, draft: null, draftSource: null }
  if (status !== 'authenticated') return { resolved: true, draft: null, draftSource: null }
  if (!cloudChecked) return { resolved: false, draft: null, draftSource: null }
  return { resolved: true, draft: pulledBill, draftSource: pulledBill ? 'cloud' : null }
}
