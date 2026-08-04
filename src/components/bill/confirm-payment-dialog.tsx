'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useBillStore } from '@/lib/store/bill-store'
import type { Bill } from '@/lib/store/types'

type Step = 'confirm' | 'done'

interface ConfirmPaymentDialogProps {
  bill: Bill
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Two steps: a lightweight confirmation, then (once the server confirms the one-way draft →
 * completed transition) the two next actions CLAUDE.md specifies — start a new bill, or return
 * home. `discardBill` for "Return home" is safe/lossless here: the bill is already durably saved
 * server-side by this point, so clearing the local copy just returns to the launch screen.
 */
export function ConfirmPaymentDialog({ bill, open, onOpenChange }: ConfirmPaymentDialogProps) {
  const t = useTranslations('Bills')
  const tCommon = useTranslations('Common')
  const markBillCompleted = useBillStore((s) => s.markBillCompleted)
  const startNewBill = useBillStore((s) => s.startNewBill)
  const discardBill = useBillStore((s) => s.discardBill)

  const [step, setStep] = useState<Step>('confirm')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setStep('confirm')
      setSubmitting(false)
      setError(null)
    }
  }

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/bills/${bill.id}/complete`, { method: 'POST' })
      if (!res.ok) throw new Error('failed to confirm payment')
      markBillCompleted()
      setStep('done')
    } catch {
      setError(t('confirmPaymentSyncError'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleStartNew() {
    startNewBill()
    onOpenChange(false)
  }

  function handleReturnHome() {
    discardBill()
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        {step === 'confirm' ? (
          <>
            <DrawerHeader>
              <DrawerTitle>{t('confirmPaymentDialogTitle')}</DrawerTitle>
              <DrawerDescription>{t('confirmPaymentDialogDescription')}</DrawerDescription>
            </DrawerHeader>

            {error && <p className="px-8 text-xs text-destructive">{error}</p>}

            <DrawerFooter>
              <Button disabled={submitting} onClick={handleConfirm}>
                {t('confirmPaymentDialogConfirm')}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" disabled={submitting}>
                  {tCommon('cancel')}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle>{t('confirmedNextActionTitle')}</DrawerTitle>
            </DrawerHeader>
            <DrawerFooter>
              <Button onClick={handleStartNew}>{t('confirmedStartNewAction')}</Button>
              <Button variant="outline" onClick={handleReturnHome}>
                {t('confirmedReturnHomeAction')}
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
