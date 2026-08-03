'use client'

import { useState } from 'react'
import { ReceiptText, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BRAND_NAME } from '@/lib/brand'
import { NewBillConfirmSheet } from './new-bill-confirm-sheet'

export function AppHeader() {
  const t = useTranslations('App')
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ReceiptText className="size-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={t('newBillAction')}
          className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-card text-foreground/70 shadow-soft transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-elevated active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <RotateCcw className="size-5" aria-hidden="true" />
        </button>
      </header>

      <NewBillConfirmSheet open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  )
}
