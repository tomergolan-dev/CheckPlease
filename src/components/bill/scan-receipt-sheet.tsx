'use client'

import { useRef, useState } from 'react'
import { Camera, CircleX, Images, Loader2, Plus, ScanLine, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { minorUnitsToInputValue, parseInputValueToMinorUnits } from '@/lib/money'
import { scanReceipt, ScanReceiptError, type ScanReceiptErrorCode } from '@/lib/receipt-scan'

interface DraftRow {
  id: string
  name: string
  priceValue: string
  included: boolean
}

type Step = 'picker' | 'processing' | 'review' | 'error'
type ErrorCode = ScanReceiptErrorCode | 'no_items'

export function ScanReceiptSheet() {
  const t = useTranslations('Items')
  const tCommon = useTranslations('Common')
  const addItem = useBillStore((s) => s.addItem)
  const currency = useBillStore((s) => s.bill?.currency ?? 'ILS')

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('picker')
  const [rows, setRows] = useState<DraftRow[]>([])
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('picker')
    setRows([])
    setErrorCode(null)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
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
          id: crypto.randomUUID(),
          name: item.name,
          priceValue: minorUnitsToInputValue(item.priceMinorUnits, currency),
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

  const includedCount = rows.filter((row) => row.included).length

  function confirmReview() {
    for (const row of rows) {
      if (!row.included) continue
      const name = row.name.trim()
      if (!name) continue
      addItem({
        name,
        unitPriceMinorUnits: parseInputValueToMinorUnits(row.priceValue, currency),
        source: 'scanned',
      })
    }
    setOpen(false)
    reset()
  }

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
            className="flex items-center gap-2 self-start rounded-full border border-dashed border-border py-1 ps-1 pe-3.5 text-sm font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-foreground hover:shadow-soft active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ScanLine className="size-4" />
            </span>
            {t('scanReceipt')}
          </button>
        </DrawerTrigger>

        <DrawerContent>
          {step === 'picker' && (
            <>
              <DrawerHeader>
                <DrawerTitle>{t('scanReceipt')}</DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col gap-2 px-4 pb-2">
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
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Loader2 className="size-6 animate-spin" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{t('scanProcessingTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('scanProcessingHint')}</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <>
              <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
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
                <Button onClick={() => setStep('picker')}>{t('scanTryAgain')}</Button>
                <DrawerClose asChild>
                  <Button variant="outline">{t('scanAddManually')}</Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}

          {step === 'review' && (
            <>
              <DrawerHeader>
                <DrawerTitle>{t('scanReviewTitle')}</DrawerTitle>
                <DrawerDescription>{t('scanReviewHint')}</DrawerDescription>
              </DrawerHeader>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-2">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={`flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 transition-opacity ${
                      row.included ? '' : 'opacity-40'
                    }`}
                  >
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.id, { name: e.target.value })}
                        disabled={!row.included}
                      />
                      <div className="relative w-24">
                        <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-xs text-muted-foreground">
                          ₪
                        </span>
                        <Input
                          inputMode="decimal"
                          value={row.priceValue}
                          onChange={(e) => updateRow(row.id, { priceValue: e.target.value })}
                          disabled={!row.included}
                          className="ps-6 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateRow(row.id, { included: !row.included })}
                      aria-label={row.included ? t('scanExcludeItem') : t('scanIncludeItem')}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {row.included ? <X className="size-4" /> : <Plus className="size-4" />}
                    </button>
                  </div>
                ))}
              </div>

              <DrawerFooter>
                <Button disabled={includedCount === 0} onClick={confirmReview}>
                  {t('scanAddCount', { count: includedCount })}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">{tCommon('cancel')}</Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}
