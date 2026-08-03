'use client'

import { useState } from 'react'
import { ReceiptText, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BRAND_NAME } from '@/lib/brand'
import { AccountButton } from './account-button'
import { AccountSheet } from './account-sheet'
import { NewBillConfirmSheet } from './new-bill-confirm-sheet'

export function AppHeader() {
  const t = useTranslations('App')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-accent text-primary shadow-soft">
            <ReceiptText className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
        </div>

        <div className="flex items-center gap-2">
          <AccountButton onClick={() => setAccountOpen(true)} />

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={t('newBillAction')}
            className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-card text-foreground/70 shadow-soft transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-elevated active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <NewBillConfirmSheet open={confirmOpen} onOpenChange={setConfirmOpen} />
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  )
}
