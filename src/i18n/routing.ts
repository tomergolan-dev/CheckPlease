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
  // No manual language switcher yet, so browser/device locale detection is the only way users land in the right language.
  localeDetection: true,
})
