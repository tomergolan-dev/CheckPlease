import { defineRouting } from 'next-intl/routing'

export const locales = ['en', 'he'] as const

export type AppLocale = (typeof locales)[number]

export const localeDirections: Record<AppLocale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  he: 'rtl',
}

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
})
