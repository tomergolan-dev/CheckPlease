'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { locales, type AppLocale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

// Each language is always written in itself, so someone stuck in the wrong language can still
// recognize their own — which is why these aren't in the message catalogs.
const LOCALE_NAMES: Record<AppLocale, string> = {
  he: 'עברית',
  en: 'English',
}

/** A compact two-option control; the choice applies on tap and never touches the bill. */
export function LanguageSwitcher({ labelledBy, onChange }: { labelledBy: string; onChange?: () => void }) {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()

  function handleSelect(next: AppLocale) {
    if (next === locale) return
    onChange?.()
    startTransition(() => router.replace(pathname, { locale: next }))
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid w-40 grid-cols-2 gap-1 rounded-full bg-muted/70 p-1">
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === locale}
          lang={option}
          onClick={() => handleSelect(option)}
          className={cn(
            'h-9 rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            option === locale ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {LOCALE_NAMES[option]}
        </button>
      ))}
    </div>
  )
}
