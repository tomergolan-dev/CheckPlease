'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, CreditCard, FlaskConical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { CREDIT_PACKS, type PackType } from '@/lib/credits/packs'
import { formatCurrency } from '@/lib/money'

// Stripe's published test card: in test mode it always succeeds and never charges anything.
const TEST_CARD_NUMBER = '4242 4242 4242 4242'

/** Shown only while Stripe is in test mode, so a visitor knows nothing is charged and how to pay. */
function DemoNotice() {
  const t = useTranslations('Credits')
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(TEST_CARD_NUMBER.replaceAll(' ', ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Copying is a convenience; the number stays on screen to type by hand.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-muted/50 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <FlaskConical className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {t('demoTitle')}
      </p>
      <p className="text-xs text-muted-foreground">{t('demoHint')}</p>
      <div className="flex items-center gap-2">
        <span dir="ltr" className="flex-1 text-start font-mono text-sm tabular-nums tracking-wide rtl:text-end">
          {TEST_CARD_NUMBER}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-medium text-foreground/80 shadow-soft transition-colors hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {copied ? t('demoCopiedLabel') : t('demoCopyAction')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{t('demoCardDetails')}</p>
    </div>
  )
}

export function CreditPackSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('Credits')
  const tCommon = useTranslations('Common')
  const [submittingType, setSubmittingType] = useState<PackType | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Set once the server says payments are down (not a retryable blip): the packs give way to an
  // explanation, since tapping them again would only fail the same way.
  const [unavailable, setUnavailable] = useState(false)
  const [demoPayments, setDemoPayments] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch('/api/credits/balance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled || !data || typeof data !== 'object') return
        if ('demoPayments' in data && typeof data.demoPayments === 'boolean') setDemoPayments(data.demoPayments)
      })
      .catch(() => {
        // Without the answer the notice just stays hidden; buying still works.
      })
    return () => {
      cancelled = true
    }
  }, [open])

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
        const code = data && typeof data === 'object' && 'error' in data ? data.error : null
        if (code === 'payments_unavailable') setUnavailable(true)
        else if (response.status === 401) setError(t('purchaseSignedOutError'))
        else if (code === 'upstream_error') setError(t('purchaseRetryError'))
        else setError(t('purchaseError'))
        setSubmittingType(null)
        return
      }
      // A real, full-page redirect to Stripe Checkout — credits are only ever granted by the
      // checkout.session.completed webhook once payment actually completes there, never here.
      // eslint-disable-next-line react-hooks/immutability -- browser navigation, not a React state mutation
      window.location.href = url
    } catch {
      setError(navigator.onLine ? t('purchaseRetryError') : t('purchaseOfflineError'))
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
          setUnavailable(false)
          setSubmittingType(null)
        }
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('packPickerTitle')}</DrawerTitle>
        </DrawerHeader>

        {unavailable ? (
          <div className="mx-8 flex flex-col items-center gap-2 rounded-2xl bg-muted/50 px-5 py-6 text-center">
            <CreditCard className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">{t('purchaseUnavailableTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('purchaseUnavailableHint')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-8">
            {demoPayments && (
              <div className="mb-2">
                <DemoNotice />
              </div>
            )}
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.type}
                type="button"
                onClick={() => handleBuy(pack.type)}
                disabled={submittingType !== null}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
                  pack.badge === 'popular' ? 'border-primary bg-card' : 'border-border bg-background'
                )}
              >
                <span className="flex items-center gap-2">
                  {t('packLabel', { count: pack.credits })}
                  {pack.badge === 'popular' && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {t('popularBadge')}
                    </span>
                  )}
                  {pack.badge === 'value' && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {t('valueBadge')}
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-muted-foreground">{formatCurrency(pack.priceMinorUnits, pack.currency)}</span>
              </button>
            ))}

            {error && (
              <p role="alert" className="pt-1 text-center text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{unavailable ? tCommon('close') : tCommon('cancel')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
