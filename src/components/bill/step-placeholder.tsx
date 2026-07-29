'use client'

import { useTranslations } from 'next-intl'
import { StepHeader } from '@/components/shared/step-header'
import { useBillStore } from '@/lib/store/bill-store'
import type { BillStep } from '@/lib/store/types'

const PREVIOUS_STEP: Partial<Record<BillStep, BillStep>> = {
  items: 'diners',
  tip: 'items',
  summary: 'tip',
}

export function StepPlaceholder({ title, step }: { title: string; step: BillStep }) {
  const t = useTranslations('StepPlaceholder')
  const goToStep = useBillStore((s) => s.goToStep)
  const previous = PREVIOUS_STEP[step]

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title={title} onBack={previous ? () => goToStep(previous) : undefined} />
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="text-muted-foreground text-sm">{t('comingSoon')}</p>
      </div>
    </div>
  )
}
