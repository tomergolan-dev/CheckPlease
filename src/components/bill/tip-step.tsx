'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { StepHeader } from '@/components/shared/step-header'
import { AnimatedCurrency } from '@/components/shared/animated-currency'
import { useBillStore } from '@/lib/store/bill-store'
import { computeBillSubtotal, computeTipTotal } from '@/lib/money'
import type { Bill } from '@/lib/store/types'
import { TipCard } from './tip-card'

export function TipStep({ bill }: { bill: Bill }) {
  const t = useTranslations('Tip')
  const tCommon = useTranslations('Common')
  const goToStep = useBillStore((s) => s.goToStep)

  const subtotal = computeBillSubtotal(bill.items)
  const tipTotal = computeTipTotal(subtotal, bill.tip)
  const total = subtotal + tipTotal

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title={t('title')} onBack={() => goToStep('items')} />

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{tCommon('subtotal')}</span>
            <AnimatedCurrency amount={subtotal} currency={bill.currency} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{tCommon('tipAmount')}</span>
            <AnimatedCurrency amount={tipTotal} currency={bill.currency} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>{tCommon('total')}</span>
            <AnimatedCurrency amount={total} currency={bill.currency} />
          </div>
        </div>

        <TipCard bill={bill} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
        <Button size="lg" onClick={() => goToStep('summary')}>
          {tCommon('continue')}
        </Button>
      </div>
    </div>
  )
}
