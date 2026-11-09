'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Clock, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 10

type ReturnState =
  | { step: 'idle' }
  | { step: 'checking' }
  | { step: 'granted'; credits: number }
  | { step: 'pending' }

async function fetchPurchasedCredits(sessionId: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/credits/purchase/status?session_id=${encodeURIComponent(sessionId)}`)
    if (!response.ok) return null
    const data: unknown = await response.json()
    if (data && typeof data === 'object' && 'credits' in data && typeof data.credits === 'number') {
      return data.credits
    }
  } catch {
    // A failed check is treated like "not recorded yet" and simply tried again.
  }
  return null
}

function removePurchaseParams() {
  const url = new URL(window.location.href)
  url.searchParams.delete('purchase')
  url.searchParams.delete('session_id')
  window.history.replaceState(window.history.state, '', url)
}

/** Shown when returning from Stripe Checkout. Reports what the server recorded, not what the URL says. */
export function PurchaseReturnSheet() {
  const t = useTranslations('Credits')
  const tCommon = useTranslations('Common')
  const [state, setState] = useState<ReturnState>({ step: 'idle' })
  const dismissedRef = useRef(false)

  // The URL is an external system that can't be read during server rendering, so this runs in an
  // effect. The parameters stay in the URL until the check settles, because Strict Mode runs this
  // effect twice and the second run has to find them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('purchase')
    if (!outcome) return

    const sessionId = params.get('session_id')
    if (outcome !== 'success' || !sessionId) {
      removePurchaseParams()
      return
    }

    let stopped = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-system sync, see above
    setState({ step: 'checking' })

    async function check(id: string) {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        const credits = await fetchPurchasedCredits(id)
        if (stopped) return
        if (credits !== null) {
          removePurchaseParams()
          if (!dismissedRef.current) setState({ step: 'granted', credits })
          return
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        if (stopped) return
      }
      removePurchaseParams()
      if (!dismissedRef.current) setState({ step: 'pending' })
    }

    void check(sessionId)
    return () => {
      stopped = true
    }
  }, [])

  function handleOpenChange(open: boolean) {
    if (open) return
    dismissedRef.current = true
    setState({ step: 'idle' })
  }

  // Keeps the last message on screen while the sheet animates closed.
  const [shown, setShown] = useState<ReturnState>(state)
  if (state.step !== 'idle' && state !== shown) {
    setShown(state)
  }

  return (
    <Drawer open={state.step !== 'idle'} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="items-center gap-3 pt-6">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
            {shown.step === 'granted' ? (
              <Check className="size-6" aria-hidden="true" />
            ) : shown.step === 'pending' ? (
              <Clock className="size-6" aria-hidden="true" />
            ) : (
              <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            )}
          </span>
          <DrawerTitle>
            {shown.step === 'granted'
              ? t('purchaseGrantedTitle')
              : shown.step === 'pending'
                ? t('purchasePendingTitle')
                : t('purchaseCheckingTitle')}
          </DrawerTitle>
          {shown.step === 'granted' && (
            <DrawerDescription>{t('purchaseGrantedHint', { count: shown.credits })}</DrawerDescription>
          )}
          {shown.step === 'pending' && <DrawerDescription>{t('purchasePendingHint')}</DrawerDescription>}
        </DrawerHeader>

        {shown.step !== 'checking' && (
          <DrawerFooter>
            <Button onClick={() => handleOpenChange(false)}>{tCommon('done')}</Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
