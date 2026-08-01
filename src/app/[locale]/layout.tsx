import type { Metadata, Viewport } from 'next'
import { Heebo } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing, localeDirections, type AppLocale } from '@/i18n/routing'
import { BRAND_NAME } from '@/lib/brand'
import '../globals.css'

const heebo = Heebo({
  subsets: ['latin', 'hebrew'],
  variable: '--font-heebo',
  display: 'swap',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: 'Split the bill. Skip the math.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: BRAND_NAME,
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Makes the on-screen keyboard actually resize the layout viewport (like a native app)
  // instead of just overlaying it — vh/dvh-based sheet heights, sticky positioning, and
  // native scroll-into-view all become reliable once the keyboard opens, so bottom sheets
  // no longer need JS-driven keyboard-avoidance hacks that can get stuck mid-transition.
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfcfc' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()
  const direction = localeDirections[locale as AppLocale]

  return (
    <html lang={locale} dir={direction} className={heebo.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
