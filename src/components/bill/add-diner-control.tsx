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
        className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl py-1 transition-all hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
          <Plus className="size-5" aria-hidden="true" />
        </span>
        <span className="w-full text-center text-xs leading-tight font-medium text-muted-foreground">
          {t('addDiner')}
        </span>
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
