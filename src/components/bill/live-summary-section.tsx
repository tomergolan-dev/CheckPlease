'use client'

import { ChevronRight, Receipt, Wallet } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { basisPointsToPercentage, computeBillSubtotal, computeTipTotal } from '@/lib/money'
import { getBillPayableSummary, getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AnimatedCurrency } from '@/components/shared/animated-currency'
import { SectionHeading } from '@/components/shared/section-heading'
import { DinerAvatar } from './diner-avatar'
import { DINER_TEXT_CLASSES } from './diner-display'
import { TipAndRoundingCard } from './tip-and-rounding-card'
import { useDinerLabel } from './use-diner-label'

export function LiveSummarySection({ bill }: { bill: Bill }) {
  const t = useTranslations('Summary')
  const dinerLabel = useDinerLabel()
  const shouldReduceMotion = useReducedMotion()

  if (bill.items.length === 0) {
    return null
  }

  const positions = getDinerDefaultPositions(bill.diners)
  const originalAmount = computeBillSubtotal(bill.items)
  const tipTotal = computeTipTotal(originalAmount, bill.tip)
  const exactTotal = originalAmount + tipTotal
  const payable = getBillPayableSummary(bill)

  // The rounding row only matters once it actually changes what's collected. Subtotal is
  // only worth its own row when there's a further row after it (rounding) that changes the
  // number again — otherwise "original + tip" and "total to pay" are the same figure, and
  // showing both is a redundant row rather than a real breakdown step.
  const showRoundingRow = bill.roundUpPayments && payable.roundingSurplusMinorUnits > 0
  const showSubtotalRow = tipTotal > 0 && showRoundingRow
  const totalToPay = showRoundingRow ? payable.payableGrandTotalMinorUnits : exactTotal
  const tipPercent = basisPointsToPercentage(bill.tip.valueBasisPoints)

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading icon={Receipt} title={t('title')} tone="violet" />

      <TipAndRoundingCard
        bill={bill}
        tipTotalMinorUnits={tipTotal}
        roundingSurplusMinorUnits={payable.roundingSurplusMinorUnits}
        currency={bill.currency}
      />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: -14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22 }}
        className="flex flex-col gap-2 rounded-[22px] border border-border/40 bg-card px-4 pt-3.5 pb-4 shadow-soft"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('originalAmount')}</span>
          <AnimatedCurrency amount={originalAmount} currency={bill.currency} className="text-foreground/85" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {tipTotal > 0 ? `${t('tip')} (${tipPercent}%)` : t('tip')}
          </span>
          <AnimatedCurrency amount={tipTotal} currency={bill.currency} className="text-foreground/85" />
        </div>

        {showSubtotalRow && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('subtotal')}</span>
            <AnimatedCurrency amount={exactTotal} currency={bill.currency} className="text-foreground/85" />
          </div>
        )}

        {showRoundingRow && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('rounding')}</span>
            <AnimatedCurrency
              amount={payable.roundingSurplusMinorUnits}
              currency={bill.currency}
              className="text-foreground/85"
            />
          </div>
        )}

        <div className="flex items-end justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-muted-foreground">{t('totalToPay')}</span>
          <AnimatedCurrency
            amount={totalToPay}
            currency={bill.currency}
            className="text-2xl leading-none font-bold text-primary"
          />
        </div>
      </motion.div>

      <SectionHeading icon={Wallet} title={t('eachPersonPays')} tone="teal" />

      <div className="grid grid-cols-3 gap-2.5">
        {payable.diners.map((dinerTotal) => {
          const diner = bill.diners.find((d) => d.id === dinerTotal.dinerId)
          if (!diner) return null
          const isRounded = dinerTotal.payableMinorUnits !== dinerTotal.exactMinorUnits
          return (
            <div
              key={dinerTotal.dinerId}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/40 bg-card px-2 py-3 shadow-soft"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <DinerAvatar
                  diner={diner}
                  defaultPosition={positions[diner.id]}
                  size={20}
                  className="shrink-0"
                />
                <span className="truncate text-xs font-medium">{dinerLabel(diner, positions[diner.id])}</span>
              </div>

              {/* Fixed-height, non-wrapping stack so every card lines up identically regardless
                  of whether rounding applies to this diner or how many digits their amount has. */}
              <div className="flex min-h-11 flex-col items-center justify-center gap-0.5">
                {isRounded && (
                  <span className="flex items-center gap-1 text-[11px] whitespace-nowrap text-muted-foreground">
                    <AnimatedCurrency amount={dinerTotal.exactMinorUnits} currency={bill.currency} />
                    <ChevronRight className="size-3 shrink-0 rtl:rotate-180" aria-hidden="true" />
                  </span>
                )}
                <AnimatedCurrency
                  amount={dinerTotal.payableMinorUnits}
                  currency={bill.currency}
                  className={`text-lg leading-none font-extrabold whitespace-nowrap ${DINER_TEXT_CLASSES[diner.color]}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
