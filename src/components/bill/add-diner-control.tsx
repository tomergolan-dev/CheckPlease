'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useBillStore } from '@/lib/store/bill-store'

export function AddDinerControl({ hasExistingItems }: { hasExistingItems: boolean }) {
  const t = useTranslations('Diners')
  const tCommon = useTranslations('Common')
  const addDiner = useBillStore((s) => s.addDiner)
  const [askOpen, setAskOpen] = useState(false)
  const [includeInExistingItems, setIncludeInExistingItems] = useState(true)

  function handleAdd() {
    if (hasExistingItems) {
      setIncludeInExistingItems(true)
      setAskOpen(true)
      return
    }
    addDiner()
  }

  function confirmAdd() {
    addDiner({ includeInExistingItems })
    setAskOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Plus className="size-4" />
        {t('addDiner')}
      </button>

      <Drawer open={askOpen} onOpenChange={setAskOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('includeExistingItemsQuestion')}</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4">
            <Button
              type="button"
              variant={includeInExistingItems ? 'default' : 'outline'}
              aria-pressed={includeInExistingItems}
              onClick={() => setIncludeInExistingItems(true)}
              className="justify-start"
            >
              {t('includeYes')}
            </Button>
            <Button
              type="button"
              variant={!includeInExistingItems ? 'default' : 'outline'}
              aria-pressed={!includeInExistingItems}
              onClick={() => setIncludeInExistingItems(false)}
              className="justify-start"
            >
              {t('includeNo')}
            </Button>
          </div>
          <DrawerFooter>
            <Button onClick={confirmAdd}>{t('confirmAdd')}</Button>
            <DrawerClose asChild>
              <Button variant="outline">{tCommon('cancel')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
