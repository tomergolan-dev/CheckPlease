'use client'

import { ChevronRight, Receipt } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { computeBillSubtotal, computeTipTotal } from '@/lib/money'
import { useBillStore } from '@/lib/store/bill-store'
import { getBillPayableSummary, getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AnimatedCurrency } from '@/components/shared/animated-currency'
import { SectionHeading } from '@/components/shared/section-heading'
import { Switch } from '@/components/ui/switch'
import { DinerAvatar } from './diner-avatar'
import { TipChip } from './tip-chip'
import { useDinerLabel } from './use-diner-label'

export function LiveSummarySection({ bill }: { bill: Bill }) {
  const t = useTranslations('Summary')
  const dinerLabel = useDinerLabel()
  const setRoundUpPayments = useBillStore((s) => s.setRoundUpPayments)

  if (bill.items.length === 0) {
    return null
  }

  const positions = getDinerDefaultPositions(bill.diners)
  const originalAmount = computeBillSubtotal(bill.items)
  const tipTotal = computeTipTotal(originalAmount, bill.tip)
  const exactTotal = originalAmount + tipTotal
  const payable = getBillPayableSummary(bill)

  // Subtotal only adds information once tip exists (original + 0 tip == subtotal), and
  // the rounding row only matters once it actually changes what's collected.
  const showSubtotalRow = tipTotal > 0
  const showRoundingRow = bill.roundUpPayments && payable.roundingSurplusMinorUnits > 0
  const totalToPay = showRoundingRow ? payable.payableGrandTotalMinorUnits : exactTotal

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading icon={Receipt} title={t('title')} />

      <TipChip bill={bill} />

      <label className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-soft transition-shadow hover:shadow-elevated">
        <span className="text-sm font-medium">{t('roundUpToggleLabel')}</span>
        <Switch
          checked={bill.roundUpPayments}
          onCheckedChange={setRoundUpPayments}
          aria-label={t('roundUpToggleLabel')}
        />
      </label>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-elevated">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('originalAmount')}</span>
          <AnimatedCurrency amount={originalAmount} currency={bill.currency} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('tip')}</span>
          <AnimatedCurrency amount={tipTotal} currency={bill.currency} />
        </div>

        {showSubtotalRow && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('subtotal')}</span>
            <AnimatedCurrency amount={exactTotal} currency={bill.currency} />
          </div>
        )}

        {showRoundingRow && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('rounding')}</span>
            <span className="flex items-center gap-0.5 text-muted-foreground">
              +<AnimatedCurrency amount={payable.roundingSurplusMinorUnits} currency={bill.currency} />
            </span>
          </div>
        )}

        <div className="flex items-end justify-between border-t border-border pt-3">
          <span className="text-sm font-medium text-muted-foreground">{t('totalToPay')}</span>
          <AnimatedCurrency amount={totalToPay} currency={bill.currency} className="text-2xl font-bold text-primary" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {payable.diners.map((dinerTotal) => {
          const diner = bill.diners.find((d) => d.id === dinerTotal.dinerId)
          if (!diner) return null
          const isRounded = dinerTotal.payableMinorUnits !== dinerTotal.exactMinorUnits
          return (
            <div
              key={dinerTotal.dinerId}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-3 py-2.5 shadow-soft transition-shadow hover:shadow-elevated"
            >
              <div className="flex items-center gap-2">
                <DinerAvatar
                  diner={diner}
                  defaultPosition={positions[diner.id]}
                  className="size-8 text-xs ring-2 ring-card"
                />
                <span className="text-sm font-medium">{dinerLabel(diner, positions[diner.id])}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isRounded && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      <AnimatedCurrency amount={dinerTotal.exactMinorUnits} currency={bill.currency} />
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground rtl:rotate-180" />
                  </>
                )}
                <AnimatedCurrency
                  amount={dinerTotal.payableMinorUnits}
                  currency={bill.currency}
                  className="text-base font-semibold"
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
