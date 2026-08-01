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
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-accent/60 px-4 py-3.5 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:bg-accent/80 hover:shadow-soft active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" aria-hidden="true" />
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
