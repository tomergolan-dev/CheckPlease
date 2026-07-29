'use client'

import { useEffect } from 'react'
import { useBillStore } from './bill-store'

/**
 * Persisted state only exists client-side, so hydration is skipped by default (see
 * `skipHydration` in bill-store.ts) to keep the first server-rendered pass and the
 * first client pass identical. Mount this once, high in the client tree, to read
 * localStorage after that first pass instead of during it.
 */
export function HydrateBillStore() {
  useEffect(() => {
    useBillStore.persist.rehydrate()
  }, [])

  return null
}
