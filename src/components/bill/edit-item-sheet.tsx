'use client'

import { useMemo, useState } from 'react'
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
import { getDinerDefaultPositions } from '@/lib/store/selectors'
import { minorUnitsToInputValue, parseInputValueToMinorUnits } from '@/lib/money'
import type { Bill } from '@/lib/store/types'
import { DinerToggleChip } from './diner-toggle-chip'
import { ItemFormFields } from './item-form-fields'
import { useDinerLabel } from './use-diner-label'

interface EditItemSheetProps {
  bill: Bill
  itemId: string | null
  onOpenChange: (open: boolean) => void
}

export function EditItemSheet({ bill, itemId, onOpenChange }: EditItemSheetProps) {
  const t = useTranslations('Items')
  const tCommon = useTranslations('Common')
  const updateItem = useBillStore((s) => s.updateItem)
  const removeItem = useBillStore((s) => s.removeItem)
  const setItemDiners = useBillStore((s) => s.setItemDiners)
  const dinerLabel = useDinerLabel()

  // Keep showing the last-selected item while the sheet animates closed.
  const [lastItemId, setLastItemId] = useState<string | null>(null)
  if (itemId && itemId !== lastItemId) {
    setLastItemId(itemId)
  }
  const activeItemId = itemId ?? lastItemId

  const positions = useMemo(() => getDinerDefaultPositions(bill.diners), [bill.diners])
  const item = bill.items.find((i) => i.id === activeItemId)

  const [priceValue, setPriceValue] = useState('')
  const [priceItemId, setPriceItemId] = useState<string | null>(null)

  if (!item) {
    return <Drawer open={false} onOpenChange={onOpenChange} />
  }

  // Local price draft resets whenever a different item is opened.
  if (priceItemId !== item.id) {
    setPriceValue(minorUnitsToInputValue(item.unitPriceMinorUnits, bill.currency))
    setPriceItemId(item.id)
  }

  function commitPrice() {
    updateItem(item!.id, { unitPriceMinorUnits: parseInputValueToMinorUnits(priceValue, bill.currency) })
  }

  function toggleDiner(dinerId: string) {
    const isSelected = item!.sharedBy.includes(dinerId)
    if (isSelected && item!.sharedBy.length === 1) return // enforced invariant: never zero diners
    const next = isSelected
      ? item!.sharedBy.filter((id) => id !== dinerId)
      : [...item!.sharedBy, dinerId]
    setItemDiners(item!.id, next)
  }

  function handleDelete() {
    removeItem(item!.id)
    onOpenChange(false)
  }

  return (
    <Drawer open={Boolean(itemId)} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{item.name}</DrawerTitle>
        </DrawerHeader>

        <ItemFormFields
          name={item.name}
          onNameChange={(name) => updateItem(item.id, { name })}
          priceValue={priceValue}
          onPriceChange={setPriceValue}
          onPriceBlur={commitPrice}
          quantity={item.quantity}
          onQuantityChange={(quantity) => updateItem(item.id, { quantity })}
        />

        <div className="flex flex-col gap-2 px-4 pt-2">
          <span className="text-sm font-medium text-muted-foreground">{t('sharedByLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {bill.diners.map((diner) => (
              <DinerToggleChip
                key={diner.id}
                diner={diner}
                label={dinerLabel(diner, positions[diner.id])}
                defaultPosition={positions[diner.id]}
                selected={item.sharedBy.includes(diner.id)}
                disabled={item.sharedBy.length === 1 && item.sharedBy.includes(diner.id)}
                onToggle={() => toggleDiner(diner.id)}
              />
            ))}
          </div>
          {item.sharedBy.length === 1 && (
            <p className="text-xs text-muted-foreground">{t('cannotDeselectLastDiner')}</p>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{tCommon('cancel')}</Button>
          </DrawerClose>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md py-1 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t('deleteItem')}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
