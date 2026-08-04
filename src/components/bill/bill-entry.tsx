'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useBillStore } from '@/lib/store/bill-store'
import { useActiveDraft } from '@/lib/bills/use-active-draft'
import { useDraftPushSync } from '@/lib/bills/use-draft-push-sync'
import { BRAND_NAME } from '@/lib/brand'
import { DoodleAccents } from '@/components/shared/doodle-accents'
import { BillCanvas } from './bill-canvas'
import { NewBillConfirmSheet } from './new-bill-confirm-sheet'
import { OnboardingScreen } from './onboarding-screen'

function BootSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="text-2xl font-semibold tracking-tight text-muted-foreground/30">{BRAND_NAME}</span>
    </div>
  )
}

export function BillEntry() {
  const bill = useBillStore((s) => s.bill)
  const startNewBill = useBillStore((s) => s.startNewBill)
  const loadBill = useBillStore((s) => s.loadBill)
  const { resolved, draft, draftSource } = useActiveDraft()
  useDraftPushSync()
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' as const }

  // Only relevant while showing a cloud-pulled draft's Continue/Start-new choice — resolves away
  // (and this sheet stops mattering) the instant the user either loads it locally or resolves it,
  // since bill-entry then re-renders straight into BillCanvas.
  const showsCloudDraftChoice = !bill && draftSource === 'cloud' && draft !== null
  const [cloudConfirmOpen, setCloudConfirmOpen] = useState(false)

  async function handleSaveCloudDraftAndStartNew() {
    if (!draft) return
    const completeRes = await fetch(`/api/bills/${draft.id}/complete`, { method: 'POST' })
    if (!completeRes.ok) throw new Error('failed to save cloud draft before starting a new one')
    startNewBill()
  }

  async function handleDiscardCloudDraftAndStartNew() {
    if (!draft) return
    const res = await fetch(`/api/bills/${draft.id}`, { method: 'DELETE' })
    // A 404 here just means the draft was already resolved elsewhere in the meantime — the
    // desired end state (no cloud draft) already holds.
    if (!res.ok && res.status !== 404) throw new Error('failed to discard cloud draft before starting a new one')
    startNewBill()
  }

  return (
    <div className={cn('flex min-h-dvh justify-center bg-muted/40', bill && 'lg:bg-background')}>
      <div
        className={cn(
          // No overflow-hidden here — the sticky summary column on wide screens needs the
          // real page scroll container, and an ancestor with overflow:hidden (even one that
          // never actually clips anything, like this one) creates its own scroll context
          // that would silently break position:sticky for everything inside it.
          'relative w-full bg-background',
          // The onboarding hero stays a compact, centered moment at any viewport size — only
          // the active bill canvas widens to make real use of tablet/desktop space, since
          // that's where a wider layout (and the sticky summary column) actually pays off.
          // From lg up, the outer page background matches this container's own background
          // (above), so there's no visible "card floating in a frame" edge — just generous,
          // natural margins, not a boxed-in centered container.
          bill ? 'max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl' : 'max-w-md'
        )}
      >
        <DoodleAccents />
        {/* No `mode="wait"` here — unlike the MVP-era single hasHydrated gate this replaced,
            `resolved` can now settle after an async cloud-draft check (see useActiveDraft), which
            reliably left AnimatePresence's exit-tracking permanently stuck on the boot screen
            under React Strict Mode's dev-only double-effect invocation (reproduced directly via
            DOM inspection: `resolved` was already `true` in the committed render, but the boot
            child never exited). The brief boot/onboarding cross-fade this trades away is
            imperceptible next to a boot screen that can hang forever. */}
        <AnimatePresence initial={false}>
          {!resolved ? (
            <motion.div key="boot" exit={shouldReduceMotion ? undefined : { opacity: 0 }} transition={transition}>
              <BootSplash />
            </motion.div>
          ) : bill ? (
            <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>
              <BillCanvas />
            </motion.div>
          ) : (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
              transition={transition}
            >
              <OnboardingScreen
                hasActiveDraft={draft !== null}
                onContinue={() => draft && loadBill(draft)}
                onStartNew={() => (showsCloudDraftChoice ? setCloudConfirmOpen(true) : startNewBill())}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showsCloudDraftChoice && (
        <NewBillConfirmSheet
          open={cloudConfirmOpen}
          onOpenChange={setCloudConfirmOpen}
          targetStatus="draft"
          onSaveAndStartNew={handleSaveCloudDraftAndStartNew}
          onDiscardAndStartNew={handleDiscardCloudDraftAndStartNew}
          onStartNewOnly={startNewBill}
        />
      )}
    </div>
  )
}
