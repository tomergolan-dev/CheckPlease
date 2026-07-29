'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { StepHeader } from '@/components/shared/step-header'
import { useBillStore } from '@/lib/store/bill-store'
import { getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AddItemSheet } from './add-item-sheet'
import { EditItemSheet } from './edit-item-sheet'
import { ItemRow } from './item-row'

export function ItemsStep({ bill }: { bill: Bill }) {
  const t = useTranslations('Items')
  const tCommon = useTranslations('Common')
  const goToStep = useBillStore((s) => s.goToStep)

  const positions = useMemo(() => getDinerDefaultPositions(bill.diners), [bill.diners])
  const [editItemId, setEditItemId] = useState<string | null>(null)

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title={t('title')} onBack={() => goToStep('diners')} />

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
        {bill.items
          .slice()
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((item) => (
            <ItemRow key={item.id} item={item} bill={bill} positions={positions} onOpen={setEditItemId} />
          ))}

        <AddItemSheet />
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
        {bill.items.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">{t('needAtLeastOneItem')}</p>
        )}
        <Button size="lg" disabled={bill.items.length === 0} onClick={() => goToStep('tip')}>
          {tCommon('continue')}
        </Button>
      </div>

      <EditItemSheet bill={bill} itemId={editItemId} onOpenChange={(open) => !open && setEditItemId(null)} />
    </div>
  )
}
