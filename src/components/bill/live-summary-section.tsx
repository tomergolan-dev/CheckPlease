'use client'

import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { computeBillSubtotal, computeTipTotal } from '@/lib/money'
import { useBillStore } from '@/lib/store/bill-store'
import { getBillPayableSummary, getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AnimatedCurrency } from '@/components/shared/animated-currency'
import { Switch } from '@/components/ui/switch'
import { DinerAvatar } from './diner-avatar'
import { TipChip } from './tip-chip'
import { useDinerLabel } from './use-diner-label'

export function LiveSummarySection({ bill }: { bill: Bill }) {
  const tCommon = useTranslations('Common')
  const tSummary = useTranslations('Summary')
  const dinerLabel = useDinerLabel()
  const setRoundUpPayments = useBillStore((s) => s.setRoundUpPayments)

  if (bill.items.length === 0) {
    return null
  }

  const positions = getDinerDefaultPositions(bill.diners)
  const subtotal = computeBillSubtotal(bill.items)
  const tipTotal = computeTipTotal(subtotal, bill.tip)
  const total = subtotal + tipTotal
  const payable = getBillPayableSummary(bill)
  const showRounding = bill.roundUpPayments && payable.roundingSurplusMinorUnits > 0

  return (
    <section className="flex flex-col gap-3">
      <TipChip bill={bill} />

      <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-2.5 shadow-soft">
        <span className="text-sm font-medium">{tSummary('roundUpToggleLabel')}</span>
        <Switch
          checked={bill.roundUpPayments}
          onCheckedChange={setRoundUpPayments}
          aria-label={tSummary('roundUpToggleLabel')}
        />
      </label>

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

        {showRounding && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{tSummary('rounding')}</span>
              <span className="text-muted-foreground">
                +<AnimatedCurrency amount={payable.roundingSurplusMinorUnits} currency={bill.currency} />
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>{tSummary('totalPaid')}</span>
              <AnimatedCurrency amount={payable.payableGrandTotalMinorUnits} currency={bill.currency} />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {payable.diners.map((dinerTotal) => {
          const diner = bill.diners.find((d) => d.id === dinerTotal.dinerId)
          if (!diner) return null
          const isRounded = dinerTotal.payableMinorUnits !== dinerTotal.exactMinorUnits
          return (
            <div
              key={dinerTotal.dinerId}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 shadow-soft"
            >
              <div className="flex items-center gap-2">
                <DinerAvatar diner={diner} defaultPosition={positions[diner.id]} className="size-7 text-xs" />
                <span className="text-sm font-medium">{dinerLabel(diner, positions[diner.id])}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                {isRounded && (
                  <>
                    <span className="text-muted-foreground">
                      <AnimatedCurrency amount={dinerTotal.exactMinorUnits} currency={bill.currency} />
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground rtl:rotate-180" />
                  </>
                )}
                <span className="font-semibold">
                  <AnimatedCurrency amount={dinerTotal.payableMinorUnits} currency={bill.currency} />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
