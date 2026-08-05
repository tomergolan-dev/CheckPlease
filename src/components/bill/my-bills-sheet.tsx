'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronRight, Pencil, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
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
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [renameSubmitting, setRenameSubmitting] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

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
      setRenaming(false)
    }
  }

  function openDetail(id: string) {
    setSelectedId(id)
    setStep('detail')
    setRenaming(false)
  }

  function backToList() {
    setStep('list')
    setRenaming(false)
  }

  function startRename(current: string | undefined) {
    setNameDraft(current ?? '')
    setRenameError(null)
    setRenaming(true)
  }

  async function handleSaveRename() {
    if (!selected) return
    setRenameSubmitting(true)
    setRenameError(null)
    try {
      const res = await fetch(`/api/bills/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantName: nameDraft }),
      })
      if (!res.ok) throw new Error('failed to rename bill')
      const data: { bill: Bill } = await res.json()
      const renamedId = selected.id
      setEntries((prev) => prev?.map((entry) => (entry.id === renamedId ? { ...entry, bill: data.bill } : entry)) ?? prev)
      setRenaming(false)
    } catch {
      setRenameError(t('renameError'))
    } finally {
      setRenameSubmitting(false)
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
                          onClick={() => openDetail(entry.id)}
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
                {renaming ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder={t('renamePlaceholder')}
                      maxLength={60}
                      disabled={renameSubmitting}
                      className="h-9 flex-1 text-start"
                    />
                    <button
                      type="button"
                      onClick={handleSaveRename}
                      disabled={renameSubmitting}
                      aria-label={tCommon('done')}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Check className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(false)}
                      disabled={renameSubmitting}
                      aria-label={tCommon('cancel')}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DrawerTitle className="min-w-0 flex-1 truncate">
                      {selected.bill.restaurantName ?? t('myBillsListItemLabel')}
                    </DrawerTitle>
                    <button
                      type="button"
                      onClick={() => startRename(selected.bill.restaurantName)}
                      aria-label={t('renameAction')}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                {renameError && <p className="mt-1 text-xs text-destructive">{renameError}</p>}
              </DrawerHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
                <CompletedBillDetail bill={selected.bill} />
              </div>

              <DrawerFooter>
                <Button variant="outline" onClick={backToList}>
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
