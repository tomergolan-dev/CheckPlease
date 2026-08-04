'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { Bill } from '@/lib/store/types'
import { ConfirmPaymentDialog } from './confirm-payment-dialog'

/**
 * The sole way to complete a bill (see "Completing a bill" in CLAUDE.md's Cross-device sync and
 * bill history section) — signed-in users only (a guest has nowhere to save a completed bill to),
 * once at least one dish exists (mirrors LiveSummarySection's own gate, which this sits below —
 * it's a sibling, not nested inside that component, so it needs its own explicit check), and only
 * while the bill is still a draft.
 */
export function ConfirmPaymentSection({ bill }: { bill: Bill }) {
  const t = useTranslations('Bills')
  const { status } = useSession()
  const [open, setOpen] = useState(false)

  if (status !== 'authenticated') return null
  if (bill.items.length === 0) return null

  // The trigger hides once the bill is completed, but the dialog itself must keep rendering
  // regardless — it's the one that flips `bill.status` to 'completed' via markBillCompleted(),
  // and needs to stay mounted afterward to show its own "done" step (Start a new bill / Return
  // home). Gating the dialog on `bill.status` too would unmount it out from under itself the
  // instant that transition happens, before the user ever sees the next-action step.
  const showTrigger = bill.status !== 'completed'

  return (
    <>
      {showTrigger && (
        <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
          {t('confirmPaymentAction')}
        </Button>
      )}
      <ConfirmPaymentDialog bill={bill} open={open} onOpenChange={setOpen} />
    </>
  )
}
