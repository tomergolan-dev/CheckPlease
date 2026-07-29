'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { routing, type AppLocale } from '@/i18n/routing'
import { useRouter, usePathname } from '@/i18n/navigation'

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher')
  const activeLocale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function selectLocale(locale: AppLocale) {
    router.replace(pathname, { locale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t('label')}>
          <Languages />
          {t(activeLocale as AppLocale)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => selectLocale(locale)}
            data-active={locale === activeLocale}
            className="data-[active=true]:font-medium data-[active=true]:text-primary"
          >
            {t(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
