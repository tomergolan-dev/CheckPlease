'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useBillStore } from '@/lib/store/bill-store'
import { useIsBillStoreHydrated } from '@/lib/store/hydrate-bill-store'
import type { Bill } from './types'

export interface ActiveDraftState {
  /** False while hydration and (for a signed-in user) the one-time cloud check are still
   * pending — callers should render a boot state until this is true. */
  resolved: boolean
  draft: Bill | null
  draftSource: 'local' | 'cloud' | null
}

/**
 * Resolves "does an active draft exist, and where does it live" — see "Active draft sync" in
 * CLAUDE.md's Cross-device sync and bill history section: there is exactly one active draft per
 * account, synced across every signed-in device.
 *
 * For a signed-in user, the cloud is *always* checked once per load, even when a local draft
 * already exists — not only when local storage is empty. This is a deliberate correction of an
 * earlier "local always wins" simplification: a device that already has any local draft (even a
 * stale or unrelated one) would otherwise never discover a genuinely different, more recently
 * edited draft from another device, which is exactly the bug this fixes. When local and cloud
 * turn out to be two *different* drafts, last-write-wins by `updatedAt` decides which one is "the"
 * active draft — matching the already-decided sync model (no real-time collaboration) rather than
 * introducing a conflict prompt. The reconciliation happens inside the same effect that resolves
 * the cloud check, before `resolved` ever turns true, specifically so callers never observe a
 * stale local draft for even one render before it's replaced.
 *
 * The cloud-pulled draft is held in transient React state only when there's no local draft to
 * compare it against — it enters the store via `loadBill`, either automatically (the reconciliation
 * case above) or when the user taps "Continue" on the launch screen (the local-storage-empty case).
 * Mounted once in BillEntry, alongside useDraftPushSync.
 */
export function useActiveDraft(): ActiveDraftState {
  const hasHydrated = useIsBillStoreHydrated()
  const localBill = useBillStore((s) => s.bill)
  const loadBill = useBillStore((s) => s.loadBill)
  const { status } = useSession()
  const [pulledBill, setPulledBill] = useState<Bill | null>(null)
  const [cloudChecked, setCloudChecked] = useState(false)

  const needsCloudCheck = hasHydrated && status === 'authenticated'

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
        const cloudDraft = data?.bill ?? null
        // Re-read the store directly (not the `localBill` closed over from render) so this
        // reconciles against the freshest local state regardless of how long the fetch took.
        const currentLocal = useBillStore.getState().bill
        if (currentLocal && cloudDraft && cloudDraft.id !== currentLocal.id) {
          // Genuinely two different drafts — last-write-wins, applied silently (not a conflict
          // prompt) per the sync model already decided for the active draft.
          if (cloudDraft.updatedAt > currentLocal.updatedAt) {
            loadBill(cloudDraft)
          }
          // else: local is newer (or equal) — it's already authoritative, nothing to do; the
          // debounced push will keep the cloud row in sync with it as usual.
        } else if (!currentLocal) {
          // No local draft to reconcile against — hold the cloud draft in transient state for
          // the launch screen's Continue/Start-new choice (see bill-entry.tsx).
          setPulledBill(cloudDraft)
        }
        setCloudChecked(true)
      })
      .catch(() => {
        if (!cancelled) setCloudChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [needsCloudCheck, cloudChecked, loadBill])

  if (!hasHydrated) return { resolved: false, draft: null, draftSource: null }
  if (status === 'loading') return { resolved: false, draft: null, draftSource: null }

  if (status !== 'authenticated') {
    // Guest — cloud never applies, local is authoritative (unchanged).
    return { resolved: true, draft: localBill, draftSource: localBill ? 'local' : null }
  }

  if (!cloudChecked) return { resolved: false, draft: null, draftSource: null }
  if (localBill) return { resolved: true, draft: localBill, draftSource: 'local' }
  return { resolved: true, draft: pulledBill, draftSource: pulledBill ? 'cloud' : null }
}
