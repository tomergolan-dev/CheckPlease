'use client'

import { useState, useTransition } from 'react'
import { Settings } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { usePathname, useRouter } from '@/i18n/navigation'
import { locales, type AppLocale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

// Each language is always written in itself, so someone stuck in the wrong language can still
// recognize their own — which is why these aren't in the message catalogs.
const LOCALE_NAMES: Record<AppLocale, string> = {
  he: 'עברית',
  en: 'English',
}

export function SettingsControl() {
  const t = useTranslations('Settings')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  function handleSelect(next: AppLocale) {
    setOpen(false)
    if (next === locale) return
    startTransition(() => router.replace(pathname, { locale: next }))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('title')}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-foreground/70 shadow-soft transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-elevated active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Settings className="size-5" aria-hidden="true" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('title')}</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-2 px-8 pt-1 pb-8">
            <span id="settings-language-label" className="text-sm font-medium">
              {t('languageLabel')}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="settings-language-label"
              className="grid grid-cols-2 gap-1 rounded-full bg-muted/70 p-1"
            >
              {locales.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === locale}
                  lang={option}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'h-11 rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    option === locale ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {LOCALE_NAMES[option]}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
