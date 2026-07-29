'use client'

import { useTranslations } from 'next-intl'
import { computeBillSubtotal, computeTipTotal } from '@/lib/money'
import { getDinerDefaultPositions, getDinerTotals } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AnimatedCurrency } from '@/components/shared/animated-currency'
import { DinerAvatar } from './diner-avatar'
import { TipChip } from './tip-chip'
import { useDinerLabel } from './use-diner-label'

export function LiveSummarySection({ bill }: { bill: Bill }) {
  const tCommon = useTranslations('Common')
  const dinerLabel = useDinerLabel()

  if (bill.items.length === 0) {
    return null
  }

  const positions = getDinerDefaultPositions(bill.diners)
  const subtotal = computeBillSubtotal(bill.items)
  const tipTotal = computeTipTotal(subtotal, bill.tip)
  const total = subtotal + tipTotal
  const dinerTotals = getDinerTotals(bill)

  return (
    <section className="flex flex-col gap-3">
      <TipChip bill={bill} />

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

      <div className="flex flex-col gap-2">
        {dinerTotals.map((dinerTotal) => {
          const diner = bill.diners.find((d) => d.id === dinerTotal.dinerId)
          if (!diner) return null
          return (
            <div
              key={dinerTotal.dinerId}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 shadow-soft"
            >
              <div className="flex items-center gap-2">
                <DinerAvatar diner={diner} defaultPosition={positions[diner.id]} className="size-7 text-xs" />
                <span className="text-sm font-medium">{dinerLabel(diner, positions[diner.id])}</span>
              </div>
              <AnimatedCurrency amount={dinerTotal.totalMinorUnits} currency={bill.currency} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
