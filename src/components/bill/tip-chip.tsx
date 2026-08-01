'use client'

import { useState } from 'react'
import { HandCoins } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { basisPointsToPercentage } from '@/lib/money'
import type { Bill } from '@/lib/store/types'
import { TipSheet } from './tip-sheet'

export function TipChip({ bill }: { bill: Bill }) {
  const t = useTranslations('Tip')
  const [open, setOpen] = useState(false)
  const bps = bill.tip.valueBasisPoints
  const hasTip = bps > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 self-start rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          hasTip
            ? 'border-primary/40 bg-accent text-accent-foreground'
            : 'border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground'
        )}
      >
        <HandCoins className="size-4" aria-hidden="true" />
        {hasTip ? t('percentOnly', { percent: basisPointsToPercentage(bps) }) : t('addTip')}
      </button>

      <TipSheet bill={bill} open={open} onOpenChange={setOpen} />
    </>
  )
}
