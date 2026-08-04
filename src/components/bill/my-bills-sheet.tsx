'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { formatCurrency } from '@/lib/money'
import type { Bill } from '@/lib/store/types'
import { CompletedBillDetail } from './completed-bill-detail'

interface CompletedBillEntry {
  id: string
  completedAt: string
  bill: Bill
}

type Step = 'list' | 'detail'

/**
 * Strictly read-only, entirely independent of the active draft (see "My Bills" in CLAUDE.md's
 * Cross-device sync and bill history section) — opening/browsing this never touches, replaces,
 * or interrupts whatever bill is currently active.
 */
export function MyBillsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('Bills')
  const tCommon = useTranslations('Common')
  const shouldReduceMotion = useReducedMotion()

  const [step, setStep] = useState<Step>('list')
  const [entries, setEntries] = useState<CompletedBillEntry[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch('/api/bills')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed to load bills'))))
      .then((data: { bills: CompletedBillEntry[] }) => {
        if (cancelled) return
        setEntries(data.bills)
        setLoadError(false)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setStep('list')
      setSelectedId(null)
    }
  }

  const selected = entries?.find((entry) => entry.id === selectedId) ?? null
  const stepTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' as const }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <AnimatePresence mode="wait" initial={false}>
          {step === 'list' && (
            <motion.div
              key="list"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={stepTransition}
              className="flex min-h-0 flex-1 flex-col"
            >
              <DrawerHeader>
                <DrawerTitle>{t('myBillsSheetTitle')}</DrawerTitle>
              </DrawerHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
                {loadError ? (
                  <p className="px-4 py-6 text-center text-sm text-destructive">{t('myBillsLoadError')}</p>
                ) : entries === null ? null : entries.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t('myBillsEmptyState')}</p>
                ) : (
                  <div className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-soft">
                    {entries.map((entry) => {
                      const total = entry.bill.items.reduce(
                        (sum, item) => sum + item.unitPriceMinorUnits * item.quantity,
                        0
                      )
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(entry.id)
                            setStep('detail')
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/40 active:bg-muted/60"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            <span className="block truncate text-sm font-medium">
                              {entry.bill.restaurantName ?? t('myBillsListItemLabel')}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {new Date(entry.completedAt).toLocaleDateString()}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                            {formatCurrency(total, entry.bill.currency)}
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground/60 rtl:rotate-180"
                            aria-hidden="true"
                          />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">{tCommon('done')}</Button>
                </DrawerClose>
              </DrawerFooter>
            </motion.div>
          )}

          {step === 'detail' && selected && (
            <motion.div
              key="detail"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={stepTransition}
              className="flex min-h-0 flex-1 flex-col"
            >
              <DrawerHeader>
                <DrawerTitle>{selected.bill.restaurantName ?? t('myBillsListItemLabel')}</DrawerTitle>
              </DrawerHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
                <CompletedBillDetail bill={selected.bill} />
              </div>

              <DrawerFooter>
                <Button variant="outline" onClick={() => setStep('list')}>
                  {t('detailBackAction')}
                </Button>
              </DrawerFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  )
}
