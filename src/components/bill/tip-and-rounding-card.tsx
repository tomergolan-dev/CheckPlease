'use client'

import { useState } from 'react'
import { ArrowUp, ChevronRight, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { basisPointsToPercentage, type MinorUnits } from '@/lib/money'
import { useBillStore } from '@/lib/store/bill-store'
import type { Bill, CurrencyCode } from '@/lib/store/types'
import { AnimatedCurrency } from '@/components/shared/animated-currency'
import { IconBadge } from '@/components/shared/icon-badge'
import { Switch } from '@/components/ui/switch'
import { TipSheet } from './tip-sheet'

interface TipAndRoundingCardProps {
  bill: Bill
  tipTotalMinorUnits: MinorUnits
  roundingSurplusMinorUnits: MinorUnits
  currency: CurrencyCode
}

/** Tip and rounding are two rows of one card — the same "tap for a sheet" / "toggle inline"
 * interactions as before, just presented as a single consistent surface instead of a floating
 * chip plus a separate row. */
export function TipAndRoundingCard({
  bill,
  tipTotalMinorUnits,
  roundingSurplusMinorUnits,
  currency,
}: TipAndRoundingCardProps) {
  const tTip = useTranslations('Tip')
  const tSummary = useTranslations('Summary')
  const setRoundUpPayments = useBillStore((s) => s.setRoundUpPayments)
  const [tipSheetOpen, setTipSheetOpen] = useState(false)

  const bps = bill.tip.valueBasisPoints
  const showRoundingAmount = bill.roundUpPayments && roundingSurplusMinorUnits > 0

  return (
    <>
      <div className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-soft">
        <button
          type="button"
          onClick={() => setTipSheetOpen(true)}
          className="flex items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/40 active:bg-muted/60"
        >
          <IconBadge icon={Heart} tone="violet" size="sm" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">{tTip('title')}</span>
            {bps > 0 && (
              <span className="text-xs text-muted-foreground">{basisPointsToPercentage(bps)}%</span>
            )}
          </span>
          <AnimatedCurrency amount={tipTotalMinorUnits} currency={currency} className="text-sm font-medium" />
          <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
        </button>

        <label className="flex items-center gap-3 px-4 py-3">
          <IconBadge icon={ArrowUp} tone="green" size="sm" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium">{tSummary('roundUpTitle')}</span>
            <span className="text-xs text-muted-foreground">{tSummary('roundUpSubtitle')}</span>
          </span>
          {showRoundingAmount && (
            <AnimatedCurrency
              amount={roundingSurplusMinorUnits}
              currency={currency}
              className="text-sm font-medium text-muted-foreground"
            />
          )}
          <Switch
            checked={bill.roundUpPayments}
            onCheckedChange={setRoundUpPayments}
            aria-label={tSummary('roundUpTitle')}
          />
        </label>
      </div>

      <TipSheet bill={bill} open={tipSheetOpen} onOpenChange={setTipSheetOpen} />
    </>
  )
}
