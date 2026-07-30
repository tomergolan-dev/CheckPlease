'use client'

import { useState } from 'react'
import { HandCoins } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IconBadge } from '@/components/shared/icon-badge'
import { basisPointsToPercentage } from '@/lib/money'
import type { Bill } from '@/lib/store/types'
import { TipSheet } from './tip-sheet'

export function TipChip({ bill }: { bill: Bill }) {
  const t = useTranslations('Tip')
  const [open, setOpen] = useState(false)
  const bps = bill.tip.valueBasisPoints

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 self-start rounded-full border border-border/40 bg-card py-1 ps-1 pe-3.5 text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <IconBadge icon={HandCoins} tone="green" size="sm" />
        {bps === 0 ? t('addTip') : t('percentOnly', { percent: basisPointsToPercentage(bps) })}
      </button>

      <TipSheet bill={bill} open={open} onOpenChange={setOpen} />
    </>
  )
}
