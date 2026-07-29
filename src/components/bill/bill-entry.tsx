'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBillStore } from '@/lib/store/bill-store'
import { BillCanvas } from './bill-canvas'
import { OnboardingScreen } from './onboarding-screen'

export function BillEntry() {
  const bill = useBillStore((s) => s.bill)
  const startNewBill = useBillStore((s) => s.startNewBill)
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' as const }

  return (
    <div className="flex min-h-dvh justify-center bg-muted/40">
      <div className="w-full max-w-md bg-background">
        <AnimatePresence mode="wait" initial={false}>
          {bill ? (
            <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>
              <BillCanvas />
            </motion.div>
          ) : (
            <motion.div
              key="onboarding"
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
