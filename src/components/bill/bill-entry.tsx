'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useBillStore } from '@/lib/store/bill-store'
import { BRAND_NAME } from '@/lib/brand'
import { BillCanvas } from './bill-canvas'

export function BillEntry() {
  const bill = useBillStore((s) => s.bill)
  const startNewBill = useBillStore((s) => s.startNewBill)
  const t = useTranslations('App')
  const tHome = useTranslations('Home')

  return (
    <div className="flex min-h-dvh justify-center bg-muted/40">
      <div className="w-full max-w-md bg-background">
        {bill ? (
          <BillCanvas />
        ) : (
          <div className="safe-top safe-bottom safe-x flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{BRAND_NAME}</h1>
              <p className="text-muted-foreground text-base">{t('tagline')}</p>
            </div>

            <Button size="lg" className="mt-8" onClick={startNewBill}>
              {tHome('startBillCta')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
