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
  // Device language picks the first-run locale; SettingsControl can then override it.
  localeDetection: true,
  // next-intl defaults to a session cookie, which would drop a manual language choice between
  // launches of the installed app and fall back to the device language.
  localeCookie: {
    maxAge: 60 * 60 * 24 * 365,
  },
})
