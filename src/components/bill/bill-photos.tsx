'use client'

import { useState } from 'react'
import { ChevronRight, ImageIcon, ImageOff, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

function photoUrl(scanId: string) {
  return `/api/scan-photos/${encodeURIComponent(scanId)}`
}

/** One photo: a spinner until it loads, and a quiet note if it's no longer kept. */
function BillPhoto({ scanId, alt }: { scanId: string; alt: string }) {
  const t = useTranslations('Items')
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  if (state === 'missing') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted/50 px-5 py-8 text-center">
        <ImageOff className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">{t('billPhotoMissing')}</p>
      </div>
    )
  }

  return (
    // Opens the photo on its own, where the phone's own pinch-to-zoom works on small print.
    <a
      href={photoUrl(scanId)}
      target="_blank"
      rel="noopener"
      className="relative block min-h-40 overflow-hidden rounded-2xl bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {state === 'loading' && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- a private, per-user photo streamed by our own route; next/image would cache it on the server */}
      <img
        src={photoUrl(scanId)}
        alt={alt}
        onLoad={() => setState('ready')}
        onError={() => setState('missing')}
        className="block h-auto w-full"
      />
    </a>
  )
}

/**
 * The "Bill photo" row and the sheet behind it, for a bill with scanned dishes. Shown only to a
 * signed-in user: photos are private to their owner, and scanning already requires an account.
 */
export function BillPhotos({ scanIds }: { scanIds: string[] | undefined }) {
  const t = useTranslations('Items')
  const tCommon = useTranslations('Common')
  const { status } = useSession()
  const [open, setOpen] = useState(false)

  if (!scanIds || scanIds.length === 0 || status !== 'authenticated') return null

  const label = t('billPhotoAction', { count: scanIds.length })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 text-start text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ImageIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1">{label}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 rtl:rotate-180" aria-hidden="true" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-2">
            {scanIds.map((scanId, index) => (
              <BillPhoto key={scanId} scanId={scanId} alt={t('billPhotoAlt', { number: index + 1 })} />
            ))}
            <p className="text-center text-xs text-muted-foreground">{t('billPhotoHint')}</p>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">{tCommon('close')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
