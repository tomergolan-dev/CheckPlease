'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { CREDIT_PACKS, type PackType } from '@/lib/credits/packs'
import { formatCurrency } from '@/lib/money'

export function CreditPackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('Credits')
  const tCommon = useTranslations('Common')
  const [submittingType, setSubmittingType] = useState<PackType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy(packType: PackType) {
    setError(null)
    setSubmittingType(packType)
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packType }),
      })
      const data: unknown = await response.json().catch(() => null)
      const url = data && typeof data === 'object' && 'url' in data ? data.url : null
      if (!response.ok || typeof url !== 'string') {
        setError(t('purchaseError'))
        setSubmittingType(null)
        return
      }
      // A real, full-page redirect to Stripe Checkout — credits are only ever granted by the
      // checkout.session.completed webhook once payment actually completes there, never here.
      // eslint-disable-next-line react-hooks/immutability -- browser navigation, not a React state mutation
      window.location.href = url
    } catch {
      setError(t('purchaseError'))
      setSubmittingType(null)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setError(null)
          setSubmittingType(null)
        }
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('packPickerTitle')}</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-2 px-8">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.type}
              type="button"
              onClick={() => handleBuy(pack.type)}
              disabled={submittingType !== null}
              className={cn(
                'flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
                pack.recommended ? 'border-primary bg-card' : 'border-border bg-background'
              )}
            >
              <span className="flex items-center gap-2">
                {t('packLabel', { count: pack.credits })}
                {pack.recommended && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    {t('recommendedBadge')}
                  </span>
                )}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatCurrency(pack.priceMinorUnits, pack.currency)}
              </span>
            </button>
          ))}

          {error && <p className="text-xs text-destructive">{error}</p>}
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
