'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Stepper } from '@/components/shared/stepper'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useBillStore } from '@/lib/store/bill-store'
import type { Diner } from '@/lib/store/types'
import { useDinerLabel } from './use-diner-label'

interface DinerEditSheetProps {
  diner: Diner | null
  defaultPosition?: number
  canRemove: boolean
  onOpenChange: (open: boolean) => void
  onRequestRemove: (dinerId: string) => void
}

export function DinerEditSheet({
  diner,
  defaultPosition,
  canRemove,
  onOpenChange,
  onRequestRemove,
}: DinerEditSheetProps) {
  const t = useTranslations('Diners')
  const tCommon = useTranslations('Common')
  const renameDiner = useBillStore((s) => s.renameDiner)
  const setDinerPartySize = useBillStore((s) => s.setDinerPartySize)
  const dinerLabel = useDinerLabel()

  // Keep showing the last-selected diner while the sheet animates closed.
  const [lastDiner, setLastDiner] = useState<Diner | null>(null)
  if (diner && diner !== lastDiner) {
    setLastDiner(diner)
  }
  const active = diner ?? lastDiner

  const [name, setName] = useState('')
  const [nameDinerId, setNameDinerId] = useState<string | null>(null)

  if (!active) {
    return <Drawer open={false} onOpenChange={onOpenChange} />
  }

  // Local name draft resets whenever a different diner is opened.
  if (nameDinerId !== active.id) {
    setName(active.name ?? '')
    setNameDinerId(active.id)
  }

  function handleNameChange(value: string) {
    setName(value)
    // Committed live, same as every other editable field — closing the sheet is "Done,"
    // never a separate save step the user has to remember to trigger.
    renameDiner(active!.id, value)
  }

  return (
    <Drawer open={Boolean(diner)} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{dinerLabel(active, defaultPosition)}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-7">
          <Input
            autoFocus
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t('defaultLabel', { number: defaultPosition ?? 0 })}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t('partySizeLabel')}</span>
            <Stepper
              value={active.partySize}
              onChange={(size) => setDinerPartySize(active.id, size)}
              label={t('partySizeLabel')}
            />
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={() => onOpenChange(false)}>{tCommon('done')}</Button>
          {canRemove ? (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                onRequestRemove(active!.id)
              }}
              className="rounded-md py-1 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {t('confirmRemove')}
            </button>
          ) : (
            <p className="py-1 text-center text-xs text-muted-foreground">{t('lastDinerRequired')}</p>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
