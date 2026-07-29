'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useBillStore } from '@/lib/store/bill-store'
import { DinersStep } from './diners-step'
import { ItemsStep } from './items-step'
import { StepPlaceholder } from './step-placeholder'
import type { Bill } from '@/lib/store/types'

function StepContent({ bill }: { bill: Bill }) {
  const currentStep = useBillStore((s) => s.currentStep)
  const t = useTranslations('StepPlaceholder')

  switch (currentStep) {
    case 'diners':
      return <DinersStep bill={bill} />
    case 'items':
      return <ItemsStep bill={bill} />
    case 'tip':
      return <StepPlaceholder title={t('tipTitle')} step="tip" />
    case 'summary':
      return <StepPlaceholder title={t('summaryTitle')} step="summary" />
  }
}

export function BillFlow() {
  const bill = useBillStore((s) => s.bill)
  const currentStep = useBillStore((s) => s.currentStep)

  if (!bill) return null

  return (
    <div className="safe-top safe-bottom safe-x flex min-h-dvh flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex flex-1 flex-col"
        >
          <StepContent bill={bill} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
