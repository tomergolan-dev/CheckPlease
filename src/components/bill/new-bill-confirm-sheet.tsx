'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
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

interface NewBillConfirmSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The status of the bill this sheet is acting on — the caller's active draft, or a
   * cloud-pulled draft that was never loaded into the store (see useActiveDraft). */
  targetStatus: 'draft' | 'completed'
  onSaveAndStartNew: () => void | Promise<void>
  /** Also reused as the guest's single destructive action — guests never reach the draft/completed
   * branching below, they always see today's unchanged single-warning sheet. */
  onDiscardAndStartNew: () => void | Promise<void>
  onStartNewOnly: () => void
}

/**
 * Fully caller-driven — no implicit store reads for its target — so it serves both the in-canvas
 * restart action and the launch screen's cloud-draft case (whose id may not even be loaded into
 * the store yet). See "Restart behavior" in CLAUDE.md's Cross-device sync and bill history
 * section for the exact three-way/simple/guest branching this implements.
 */
export function NewBillConfirmSheet({
  open,
  onOpenChange,
  targetStatus,
  onSaveAndStartNew,
  onDiscardAndStartNew,
  onStartNewOnly,
}: NewBillConfirmSheetProps) {
  const t = useTranslations('App')
  const tCommon = useTranslations('Common')
  const { status } = useSession()
  const isGuest = status !== 'authenticated'

  const [submittingAction, setSubmittingAction] = useState<'save' | 'discard' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setSubmittingAction(null)
      setError(null)
    }
  }

  // Never proceeds to the local transition until the server call actually resolves — an
  // optimistic proceed-on-failure would let a phantom draft row reappear on another device later,
  // breaking the "real DELETE, not an orphaned invisible row" guarantee.
  async function run(action: 'save' | 'discard', fn: () => void | Promise<void>) {
    setError(null)
    setSubmittingAction(action)
    try {
      await fn()
      onOpenChange(false)
    } catch {
      setError(t('newBillConfirmSyncError'))
    } finally {
      setSubmittingAction(null)
    }
  }

  function handleStartNewOnly() {
    onStartNewOnly()
    onOpenChange(false)
  }

  if (isGuest) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('newBillConfirmTitle')}</DrawerTitle>
            <DrawerDescription>{t('newBillConfirmDescription')}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button variant="destructive" onClick={() => run('discard', onDiscardAndStartNew)}>
              {t('newBillConfirmAction')}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">{tCommon('cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  if (targetStatus === 'completed') {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('newBillConfirmCompletedTitle')}</DrawerTitle>
            <DrawerDescription>{t('newBillConfirmCompletedDescription')}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button onClick={handleStartNewOnly}>{t('newBillConfirmCompletedAction')}</Button>
            <DrawerClose asChild>
              <Button variant="outline">{tCommon('cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('newBillConfirmTitle')}</DrawerTitle>
          <DrawerDescription>{t('newBillConfirmDraftDescription')}</DrawerDescription>
        </DrawerHeader>

        {error && <p className="px-8 text-xs text-destructive">{error}</p>}

        <DrawerFooter>
          <Button disabled={submittingAction !== null} onClick={() => run('save', onSaveAndStartNew)}>
            {t('newBillConfirmSaveAction')}
          </Button>
          <Button
            variant="destructive"
            disabled={submittingAction !== null}
            onClick={() => run('discard', onDiscardAndStartNew)}
          >
            {t('newBillConfirmDiscardAction')}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={submittingAction !== null}>
              {tCommon('cancel')}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
