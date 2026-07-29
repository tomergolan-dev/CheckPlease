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
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useBillStore } from '@/lib/store/bill-store'
import { parseInputValueToMinorUnits } from '@/lib/money'
import { ItemFormFields } from './item-form-fields'

export function AddItemSheet() {
  const t = useTranslations('Items')
  const tCommon = useTranslations('Common')
  const addItem = useBillStore((s) => s.addItem)
  const currency = useBillStore((s) => s.bill?.currency ?? 'ILS')

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [priceValue, setPriceValue] = useState('')
  const [quantity, setQuantity] = useState(1)

  function reset() {
    setName('')
    setPriceValue('')
    setQuantity(1)
  }

  function confirmAdd() {
    addItem({
      name: name.trim(),
      unitPriceMinorUnits: parseInputValueToMinorUnits(priceValue, currency),
      quantity,
    })
    reset()
    setOpen(false)
  }

  const canAdd = name.trim().length > 0

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-4" />
          {t('addItem')}
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('addItem')}</DrawerTitle>
        </DrawerHeader>

        <ItemFormFields
          name={name}
          onNameChange={setName}
          priceValue={priceValue}
          onPriceChange={setPriceValue}
          onPriceBlur={() => {}}
          quantity={quantity}
          onQuantityChange={setQuantity}
        />

        <DrawerFooter>
          <Button disabled={!canAdd} onClick={confirmAdd}>
            {t('confirmAdd')}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{tCommon('cancel')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
