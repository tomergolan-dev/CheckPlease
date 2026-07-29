'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { StepHeader } from '@/components/shared/step-header'
import { useBillStore } from '@/lib/store/bill-store'
import { getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AddDinerControl } from './add-diner-control'
import { DinerRow } from './diner-row'
import { RemoveDinerSheet } from './remove-diner-sheet'

export function DinersStep({ bill }: { bill: Bill }) {
  const t = useTranslations('Diners')
  const tCommon = useTranslations('Common')
  const addDiner = useBillStore((s) => s.addDiner)
  const goToStep = useBillStore((s) => s.goToStep)

  const positions = useMemo(() => getDinerDefaultPositions(bill.diners), [bill.diners])
  const [removeDinerId, setRemoveDinerId] = useState<string | null>(null)

  // Reduce first-tap friction: a fresh bill starts with one diner already in place.
  useEffect(() => {
    if (bill.diners.length === 0) {
      addDiner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader title={t('title')} />

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4">
        {bill.diners.map((diner) => (
          <DinerRow
            key={diner.id}
            diner={diner}
            defaultPosition={positions[diner.id]}
            onRequestRemove={setRemoveDinerId}
          />
        ))}

        <AddDinerControl hasExistingItems={bill.items.length > 0} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
        {bill.diners.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">{t('needAtLeastOneDiner')}</p>
        )}
        <Button size="lg" disabled={bill.diners.length === 0} onClick={() => goToStep('items')}>
          {tCommon('continue')}
        </Button>
      </div>

      <RemoveDinerSheet
        bill={bill}
        dinerId={removeDinerId}
        onOpenChange={(open) => !open && setRemoveDinerId(null)}
      />
    </div>
  )
}
