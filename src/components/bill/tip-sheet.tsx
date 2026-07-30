'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
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
  parsePercentageInput,
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
  const shouldReduceMotion = useReducedMotion()

  const currentBps = bill.tip.valueBasisPoints
  const isCustomActive = !PRESET_BASIS_POINTS.includes(currentBps)

  const [customMode, setCustomMode] = useState(isCustomActive)
  const [customValue, setCustomValue] = useState(
    isCustomActive ? String(basisPointsToPercentage(currentBps)) : ''
  )

  const subtotal = computeBillSubtotal(bill.items)
  const parsedCustomPercentage = parsePercentageInput(customValue)
  const isCustomValueInvalid = customValue.trim().length > 0 && parsedCustomPercentage === null

  function applyPreset(bps: number) {
    setTip({ mode: 'percentage', valueBasisPoints: bps })
    onOpenChange(false)
  }

  function applyCustom() {
    if (parsedCustomPercentage === null) return
    setTip({ mode: 'percentage', valueBasisPoints: percentageToBasisPoints(parsedCustomPercentage) })
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
                aria-pressed={selected}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  selected ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-background'
                )}
              >
                <span>{bps === 0 ? t('noTip') : t('percentOnly', { percent: basisPointsToPercentage(bps) })}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {formatCurrency(computeTipTotal(subtotal, { mode: 'percentage', valueBasisPoints: bps }), bill.currency)}
                  {selected && (
                    <motion.span
                      initial={shouldReduceMotion ? false : { scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={
                        shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 15 }
                      }
                    >
                      <Check className="size-4 text-primary" />
                    </motion.span>
                  )}
                </span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setCustomMode(true)}
            aria-pressed={customMode}
            className={cn(
              'flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              customMode ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-background'
            )}
          >
            <span>{t('custom')}</span>
            {customMode && (
              <motion.span
                initial={shouldReduceMotion ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 15 }
                }
              >
                <Check className="size-4 text-primary" />
              </motion.span>
            )}
          </button>

          {customMode && (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    autoFocus
                    inputMode="decimal"
                    aria-label={t('customPercentageLabel')}
                    aria-invalid={isCustomValueInvalid}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="pe-7"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <Button onClick={applyCustom} disabled={parsedCustomPercentage === null}>
                  {t('apply')}
                </Button>
              </div>
              {isCustomValueInvalid && <p className="text-xs text-destructive">{t('invalidPercentage')}</p>}
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
