'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { basisPointsToPercentage } from '@/lib/money'
import type { Bill } from '@/lib/store/types'
import { TipSheet } from './tip-sheet'

export function TipCard({ bill }: { bill: Bill }) {
  const t = useTranslations('Tip')
  const [open, setOpen] = useState(false)
  const bps = bill.tip.valueBasisPoints

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-start shadow-soft"
      >
        <span className="text-sm font-medium text-muted-foreground">{t('title')}</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {bps === 0 ? t('noTip') : t('percentOnly', { percent: basisPointsToPercentage(bps) })}
          <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
        </span>
      </button>

      <TipSheet bill={bill} open={open} onOpenChange={setOpen} />
    </>
  )
}
