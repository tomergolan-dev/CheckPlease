'use client'

import { useEffect, useState } from 'react'
import { useBillStore } from './bill-store'

/**
 * Persisted state only exists client-side, so hydration is skipped by default (see
 * `skipHydration` in bill-store.ts) to keep the first server-rendered pass and the first
 * client pass identical — `bill` reads as `null` until this resolves. Without tracking that,
 * a returning user with an existing bill would flash the "no bill" welcome screen for a beat
 * before snapping into their real bill. Callers gate on this instead of trusting `bill` alone.
 */
export function useIsBillStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useBillStore.persist.hasHydrated())

  useEffect(() => {
    const unsubscribe = useBillStore.persist.onFinishHydration(() => setHydrated(true))
    useBillStore.persist.rehydrate()
    return unsubscribe
  }, [])

  return hydrated
}
