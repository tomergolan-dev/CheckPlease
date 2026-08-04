'use client'

import { useState } from 'react'
import { ReceiptText, RotateCcw } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { BRAND_NAME } from '@/lib/brand'
import { useBillStore } from '@/lib/store/bill-store'
import { AccountButton } from './account-button'
import { AccountSheet } from './account-sheet'
import { NewBillConfirmSheet } from './new-bill-confirm-sheet'

export function AppHeader() {
  const t = useTranslations('App')
  const { status } = useSession()
  const bill = useBillStore((s) => s.bill)
  const startNewBill = useBillStore((s) => s.startNewBill)
  const discardBill = useBillStore((s) => s.discardBill)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  // AppHeader only ever renders inside BillCanvas, which itself only renders once bill is
  // non-null — this narrows it for the callbacks below without an extra guard.
  const activeBill = bill!

  async function handleSaveAndStartNew() {
    if (status === 'authenticated') {
      // Push first, unconditionally — the debounced auto-sync may not have fired yet (e.g. the
      // user edited the bill and hit restart within the same few seconds), and completing a row
      // that doesn't exist server-side yet would 404 and silently lose the bill. A push is a safe
      // upsert either way (creates if missing, updates if not).
      const pushRes = await fetch('/api/bills/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill: activeBill }),
      })
      if (!pushRes.ok) throw new Error('failed to sync bill before saving it')
      const completeRes = await fetch(`/api/bills/${activeBill.id}/complete`, { method: 'POST' })
      if (!completeRes.ok) throw new Error('failed to save bill before starting a new one')
    }
    startNewBill()
  }

  async function handleDiscardAndStartNew() {
    if (status === 'authenticated') {
      const res = await fetch(`/api/bills/${activeBill.id}`, { method: 'DELETE' })
      // A 404 here just means there was never a synced cloud row for this draft (e.g. discarded
      // before the debounced push ever fired) — the desired end state (no cloud draft) already
      // holds, so that's not a failure.
      if (!res.ok && res.status !== 404) throw new Error('failed to discard bill before starting a new one')
    }
    discardBill()
    startNewBill()
  }

  function handleStartNewOnly() {
    startNewBill()
  }

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

      <NewBillConfirmSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        targetStatus={activeBill.status}
        onSaveAndStartNew={handleSaveAndStartNew}
        onDiscardAndStartNew={handleDiscardAndStartNew}
        onStartNewOnly={handleStartNewOnly}
      />
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  )
}
