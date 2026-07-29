'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useBillStore } from '@/lib/store/bill-store'
import {
  basisPointsToPercentage,
  computeBillSubtotal,
  computeTipTotal,
  formatCurrency,
  percentageToBasisPoints,
} from '@/lib/money'
import type { Bill } from '@/lib/store/types'

const PRESET_BASIS_POINTS = [0, 1000, 1200, 1500]

export function TipSheet({
  bill,
  open,
  onOpenChange,
}: {
  bill: Bill
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('Tip')
  const tCommon = useTranslations('Common')
  const setTip = useBillStore((s) => s.setTip)

  const currentBps = bill.tip.valueBasisPoints
  const isCustomActive = !PRESET_BASIS_POINTS.includes(currentBps)

  const [customMode, setCustomMode] = useState(isCustomActive)
  const [customValue, setCustomValue] = useState(
    isCustomActive ? String(basisPointsToPercentage(currentBps)) : ''
  )

  const subtotal = computeBillSubtotal(bill.items)

  function applyPreset(bps: number) {
    setTip({ mode: 'percentage', valueBasisPoints: bps })
    onOpenChange(false)
  }

  function applyCustom() {
    const bps = percentageToBasisPoints(Number.parseFloat(customValue))
    setTip({ mode: 'percentage', valueBasisPoints: bps })
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setCustomMode(isCustomActive)
          setCustomValue(isCustomActive ? String(basisPointsToPercentage(currentBps)) : '')
        }
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('title')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-1.5 px-4">
          {PRESET_BASIS_POINTS.map((bps) => {
            const selected = !customMode && currentBps === bps
            return (
              <button
                key={bps}
                type="button"
                onClick={() => applyPreset(bps)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium',
                  selected ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-background'
                )}
              >
                <span>{bps === 0 ? t('noTip') : t('percentOnly', { percent: basisPointsToPercentage(bps) })}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {formatCurrency(computeTipTotal(subtotal, { mode: 'percentage', valueBasisPoints: bps }), bill.currency)}
                  {selected && <Check className="size-4 text-primary" />}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className={cn(
              'flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium',
              customMode ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-background'
            )}
          >
            <span>{t('custom')}</span>
            {customMode && <Check className="size-4 text-primary" />}
          </button>

          {customMode && (
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Input
                  autoFocus
                  inputMode="decimal"
                  aria-label={t('customPercentageLabel')}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="pe-7"
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <Button onClick={applyCustom} disabled={customValue.trim().length === 0}>
                {t('apply')}
              </Button>
            </div>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{tCommon('cancel')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
