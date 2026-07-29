'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Settings, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { routing, type AppLocale } from '@/i18n/routing'
import { useRouter, usePathname } from '@/i18n/navigation'

export function SettingsMenu() {
  const t = useTranslations('Settings')
  const activeLocale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function selectLocale(locale: AppLocale) {
    router.replace(pathname, { locale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('label')}>
          <Settings />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {routing.locales.map((locale) => (
          <DropdownMenuItem key={locale} onSelect={() => selectLocale(locale)}>
            <span className="flex-1">{t(locale)}</span>
            {locale === activeLocale && <Check className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
