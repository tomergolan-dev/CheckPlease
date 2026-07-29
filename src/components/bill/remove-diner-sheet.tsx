'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { useBillStore } from '@/lib/store/bill-store'
import { getDinerDefaultPositions, getDinerRemovalImpact } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'

interface RemoveDinerSheetProps {
  bill: Bill
  dinerId: string | null
  onOpenChange: (open: boolean) => void
}

export function RemoveDinerSheet({ bill, dinerId, onOpenChange }: RemoveDinerSheetProps) {
  const t = useTranslations('Diners')
  const tCommon = useTranslations('Common')
  const removeDiner = useBillStore((s) => s.removeDiner)
  const [reassignments, setReassignments] = useState<Record<string, string>>({})

  // Keep showing the last-selected diner while the sheet animates closed, instead of
  // blanking the content the instant the parent clears its selection. Adjusted during
  // render (React's documented pattern for this) rather than in an effect, since an
  // effect would cause an extra, avoidable render pass.
  const [lastDinerId, setLastDinerId] = useState<string | null>(null)
  if (dinerId && dinerId !== lastDinerId) {
    setLastDinerId(dinerId)
  }

  const activeDinerId = dinerId ?? lastDinerId
  const positions = useMemo(() => getDinerDefaultPositions(bill.diners), [bill.diners])
  const diner = bill.diners.find((d) => d.id === activeDinerId)
  const impact = activeDinerId ? getDinerRemovalImpact(bill, activeDinerId) : null
  const remainingDiners = bill.diners.filter((d) => d.id !== activeDinerId)

  if (!diner || !impact) {
    return <Drawer open={false} onOpenChange={onOpenChange} />
  }

  const dinerName = diner.name ?? t('defaultLabel', { number: positions[diner.id] ?? 0 })
  const isResolved = impact.orphanedItemIds.every((itemId) => reassignments[itemId])

  function handleRemove() {
    if (!activeDinerId) return
    const mapped: Record<string, string[]> = {}
    for (const itemId of impact!.orphanedItemIds) {
      const replacement = reassignments[itemId]
      if (replacement) mapped[itemId] = [replacement]
    }
    removeDiner(activeDinerId, mapped)
    setReassignments({})
    onOpenChange(false)
  }

  return (
    <Drawer open={Boolean(dinerId)} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('removeDinerTitle', { name: dinerName })}</DrawerTitle>
          <DrawerDescription>
            {impact.orphanedItemIds.length === 0
              ? t('removeDinerSafeDescription')
              : t('removeDinerImpactDescription', { name: dinerName })}
          </DrawerDescription>
        </DrawerHeader>

        {impact.orphanedItemIds.length > 0 && (
          <div className="flex flex-col gap-3 px-4">
            {impact.orphanedItemIds.map((itemId) => {
              const item = bill.items.find((i) => i.id === itemId)
              if (!item) return null
              return (
                <div key={itemId} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{item.name}</span>
                  <select
                    className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
                    value={reassignments[itemId] ?? ''}
                    onChange={(e) =>
                      setReassignments((prev) => ({ ...prev, [itemId]: e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      {t('reassignPlaceholder')}
                    </option>
                    {remainingDiners.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name ?? t('defaultLabel', { number: positions[candidate.id] ?? 0 })}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        )}

        <DrawerFooter>
          <Button variant="destructive" disabled={!isResolved} onClick={handleRemove}>
            {t('confirmRemove')}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{tCommon('cancel')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
