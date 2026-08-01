'use client'

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

interface NewBillConfirmSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewBillConfirmSheet({ open, onOpenChange }: NewBillConfirmSheetProps) {
  const t = useTranslations('App')
  const tCommon = useTranslations('Common')
  const discardBill = useBillStore((s) => s.discardBill)

  function handleConfirm() {
    discardBill()
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('newBillConfirmTitle')}</DrawerTitle>
          <DrawerDescription>{t('newBillConfirmDescription')}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="destructive" onClick={handleConfirm}>
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
