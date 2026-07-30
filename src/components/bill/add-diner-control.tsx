'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/shared/icon-badge'
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
        className="flex items-center gap-2 rounded-full border border-dashed border-border py-1 ps-1 pe-3.5 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-foreground hover:shadow-soft active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <IconBadge icon={Plus} tone="blue" />
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
