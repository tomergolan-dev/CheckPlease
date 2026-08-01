'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useBillStore } from '@/lib/store/bill-store'
import { useIsBillStoreHydrated } from '@/lib/store/hydrate-bill-store'
import { BRAND_NAME } from '@/lib/brand'
import { DoodleAccents } from '@/components/shared/doodle-accents'
import { BillCanvas } from './bill-canvas'
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
  const hasHydrated = useIsBillStoreHydrated()
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' as const }

  return (
    <div className="flex min-h-dvh justify-center bg-muted/40">
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
          bill ? 'max-w-md md:max-w-2xl lg:max-w-4xl' : 'max-w-md'
        )}
      >
        <DoodleAccents />
        <AnimatePresence mode="wait" initial={false}>
          {!hasHydrated ? (
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
              <OnboardingScreen onStart={startNewBill} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
