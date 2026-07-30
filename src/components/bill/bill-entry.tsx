'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBillStore } from '@/lib/store/bill-store'
import { useIsBillStoreHydrated } from '@/lib/store/hydrate-bill-store'
import { BRAND_NAME } from '@/lib/brand'
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
      <div className="w-full max-w-md bg-background">
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
