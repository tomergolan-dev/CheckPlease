'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Camera, Check, CircleX, Images, Loader2, Pencil, Plus, ScanLine, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconBadge } from '@/components/shared/icon-badge'
import { Stepper } from '@/components/shared/stepper'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useBillStore } from '@/lib/store/bill-store'
import { formatCurrency, minorUnitsToInputValue, parseInputValueToMinorUnits } from '@/lib/money'
import { generateId } from '@/lib/id'
import { scanReceipt, ScanReceiptError, type ScanReceiptErrorCode } from '@/lib/receipt-scan'

interface DraftRow {
  id: string
  name: string
  priceValue: string
  quantity: number
  included: boolean
}

type Step = 'picker' | 'processing' | 'review' | 'error'
type ErrorCode = ScanReceiptErrorCode | 'no_items'
type AddMode = 'append' | 'replace'

export function ScanReceiptSheet() {
  const t = useTranslations('Items')
  const tCommon = useTranslations('Common')
  const addItem = useBillStore((s) => s.addItem)
  const clearItems = useBillStore((s) => s.clearItems)
  const currency = useBillStore((s) => s.bill?.currency ?? 'ILS')
  const existingItemsCount = useBillStore((s) => s.bill?.items.length ?? 0)
  const shouldReduceMotion = useReducedMotion()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('picker')
  const [rows, setRows] = useState<DraftRow[]>([])
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [addMode, setAddMode] = useState<AddMode>('append')
  // At most one row is ever editable — tapping a different row (or Done) always closes
  // whichever was open, so the list stays a stable, read-only surface everywhere else.
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // The edited row is pinned (position: sticky) to the top of the list while active, so it
  // can never end up lost behind the keyboard or scrolled out of view — this scrolls it into
  // that pinned position the moment edit mode begins.
  useEffect(() => {
    if (!editingRowId) return
    const node = rowRefs.current[editingRowId]
    if (!node) return
    const frame = requestAnimationFrame(() => {
      node.scrollIntoView({ block: 'start', behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [editingRowId, shouldReduceMotion])

  function reset() {
    setStep('picker')
    setRows([])
    setErrorCode(null)
    setAddMode('append')
    setEditingRowId(null)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setStep('processing')
    try {
      const items = await scanReceipt(file, currency)
      if (items.length === 0) {
        setErrorCode('no_items')
        setStep('error')
        return
      }
      setRows(
        items.map((item) => ({
          id: generateId(),
          name: item.name,
          priceValue: minorUnitsToInputValue(item.unitPriceMinorUnits, currency),
          quantity: item.quantity,
          included: true,
        }))
      )
      setStep('review')
    } catch (error) {
      setErrorCode(error instanceof ScanReceiptError ? error.code : 'upstream_error')
      setStep('error')
    }
  }

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const includedRows = rows.filter((row) => row.included)
  const includedCount = includedRows.length
  const includedTotalMinorUnits = includedRows.reduce(
    (sum, row) => sum + parseInputValueToMinorUnits(row.priceValue, currency) * row.quantity,
    0
  )

  function confirmReview() {
    if (addMode === 'replace') {
      clearItems()
    }
    for (const row of rows) {
      if (!row.included) continue
      const name = row.name.trim()
      if (!name) continue
      addItem({
        name,
        unitPriceMinorUnits: parseInputValueToMinorUnits(row.priceValue, currency),
        quantity: row.quantity,
        source: 'scanned',
      })
    }
    setOpen(false)
    reset()
  }

  // Shared step-to-step crossfade — reused across all four states so the sheet never hard-cuts.
  const stepInitial = shouldReduceMotion ? false : { opacity: 0, y: 6 }
  const stepExit = shouldReduceMotion ? undefined : { opacity: 0, y: -6 }
  const stepTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' as const }

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          void handleFile(file)
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          void handleFile(file)
        }}
      />

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
            <ScanLine className="size-4" aria-hidden="true" />
            {t('scanReceipt')}
          </button>
        </DrawerTrigger>

        <DrawerContent
          // Scoped to the review step only — every other step keeps normal swipe/backdrop
          // dismiss. dismissible={false} was tried and rejected: vaul gates its *entire*
          // internal close handler behind that flag, so it also silently swallowed the
          // Cancel button. data-vaul-no-drag only exempts gesture-based dismissal, leaving
          // DrawerClose (Cancel) — a direct, non-gesture close — fully intact.
          data-vaul-no-drag={step === 'review' ? true : undefined}
          onPointerDownOutside={(e) => {
            if (step === 'review') e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (step === 'review') e.preventDefault()
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {step === 'picker' && (
              <motion.div
                key="picker"
                className="flex min-h-0 flex-1 flex-col"
                initial={stepInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={stepExit}
                transition={stepTransition}
              >
                <DrawerHeader>
                  <DrawerTitle>{t('scanReceipt')}</DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col gap-2 px-7 pb-2">
                  <Button
                    size="lg"
                    className="w-full justify-start gap-2.5"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="size-4" />
                    {t('scanTakePhoto')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full justify-start gap-2.5"
                    onClick={() => libraryInputRef.current?.click()}
                  >
                    <Images className="size-4" />
                    {t('scanChooseFromLibrary')}
                  </Button>
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline">{tCommon('cancel')}</Button>
                  </DrawerClose>
                </DrawerFooter>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                key="processing"
                className="flex min-h-0 flex-1 flex-col"
                initial={stepInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={stepExit}
                transition={stepTransition}
              >
                <div className="relative mx-4 mt-4 mb-6 overflow-hidden rounded-2xl">
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- a local, ephemeral object URL; nothing to optimize
                    <img src={previewUrl} alt="" className="h-48 w-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 text-center backdrop-blur-sm">
                    <IconBadge icon={Loader2} tone="violet" size="lg" iconClassName="animate-spin" />
                    <div className="flex flex-col gap-0.5 px-7">
                      <p className="text-sm font-medium">{t('scanProcessingTitle')}</p>
                      <p className="text-xs text-muted-foreground">{t('scanProcessingHint')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div
                key="error"
                className="flex min-h-0 flex-1 flex-col"
                initial={stepInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={stepExit}
                transition={stepTransition}
              >
                <div className="flex flex-col items-center gap-4 px-7 py-8 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <CircleX className="size-6" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">
                      {errorCode === 'no_items' ? t('scanNoItemsFound') : t('scanErrorGeneric')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('scanErrorHint')}</p>
                  </div>
                </div>
                <DrawerFooter>
                  <Button onClick={reset}>{t('scanTryAgain')}</Button>
                  <DrawerClose asChild>
                    <Button variant="outline">{t('scanAddManually')}</Button>
                  </DrawerClose>
                </DrawerFooter>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div
                key="review"
                className="flex min-h-0 flex-1 flex-col"
                initial={stepInitial}
                animate={{ opacity: 1, y: 0 }}
                exit={stepExit}
                transition={stepTransition}
              >
                <DrawerHeader>
                  <DrawerTitle>{t('scanReviewTitle')}</DrawerTitle>
                  <DrawerDescription>{t('scanReviewHint', { count: rows.length })}</DrawerDescription>
                </DrawerHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-7 pt-1 pb-2">
                  {rows.map((row, index) => {
                    const isEditing = editingRowId === row.id
                    return (
                      <motion.div
                        key={row.id}
                        ref={(node) => {
                          rowRefs.current[row.id] = node
                        }}
                        layout={!shouldReduceMotion}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.16, delay: shouldReduceMotion ? 0 : index * 0.03 }}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border border-border/40 bg-card px-4 py-2.5 transition-opacity',
                          !row.included && 'opacity-40',
                          // Pinned to the top of the scrollable list while active — the field
                          // being edited can never end up hidden behind the keyboard or lost
                          // by scrolling further down the list.
                          isEditing && 'sticky top-1 z-10 shadow-elevated'
                        )}
                      >
                        {isEditing ? (
                          <div className="flex flex-1 flex-col gap-1.5">
                            <Input
                              autoFocus
                              value={row.name}
                              onChange={(e) => updateRow(row.id, { name: e.target.value })}
                            />
                            <div className="flex items-center gap-2">
                              <div className="relative w-28">
                                <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-xs text-muted-foreground">
                                  ₪
                                </span>
                                <Input
                                  inputMode="decimal"
                                  value={row.priceValue}
                                  onChange={(e) => updateRow(row.id, { priceValue: e.target.value })}
                                  className="ps-6"
                                />
                              </div>
                              <Stepper
                                value={row.quantity}
                                onChange={(quantity) => updateRow(row.id, { quantity })}
                                label={t('quantityLabel')}
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!row.included}
                            onClick={() => setEditingRowId(row.id)}
                            className="flex flex-1 items-center gap-2 text-start disabled:pointer-events-none"
                          >
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="truncate text-sm font-medium">
                                {row.name || t('namePlaceholder')}
                              </span>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {formatCurrency(parseInputValueToMinorUnits(row.priceValue, currency), currency)}
                                {row.quantity > 1 && ` × ${row.quantity}`}
                              </span>
                            </div>
                            <Pencil className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                          </button>
                        )}

                        {isEditing ? (
                          <button
                            type="button"
                            onClick={() => setEditingRowId(null)}
                            aria-label={tCommon('done')}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            <Check className="size-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateRow(row.id, { included: !row.included })}
                            aria-label={row.included ? t('scanExcludeItem') : t('scanIncludeItem')}
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            {row.included ? <X className="size-4" /> : <Plus className="size-4" />}
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>

                {existingItemsCount > 0 && (
                  <div className="flex flex-col gap-2 border-t border-border/40 px-7 pt-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t('scanExistingItemsQuestion')}
                    </span>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={addMode === 'append' ? 'default' : 'outline'}
                        aria-pressed={addMode === 'append'}
                        onClick={() => setAddMode('append')}
                        className="justify-start"
                      >
                        {t('scanKeepExisting')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={addMode === 'replace' ? 'default' : 'outline'}
                        aria-pressed={addMode === 'replace'}
                        onClick={() => setAddMode('replace')}
                        className="justify-start"
                      >
                        {t('scanReplaceExisting')}
                      </Button>
                    </div>
                    {addMode === 'replace' && (
                      <p className="text-xs text-muted-foreground">
                        {t('scanReplaceWarning', { count: existingItemsCount })}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/40 px-7 py-2.5">
                  <span className="text-sm text-muted-foreground">{t('scanReviewTotal')}</span>
                  <span className="text-base font-semibold tabular-nums">
                    {formatCurrency(includedTotalMinorUnits, currency)}
                  </span>
                </div>

                <DrawerFooter>
                  <Button disabled={includedCount === 0} onClick={confirmReview}>
                    {addMode === 'replace'
                      ? t('scanAddCountReplace', { count: includedCount })
                      : t('scanAddCount', { count: includedCount })}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline">{tCommon('cancel')}</Button>
                  </DrawerClose>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-md py-1 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {t('scanRetakePhoto')}
                  </button>
                </DrawerFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DrawerContent>
      </Drawer>
    </>
  )
}
