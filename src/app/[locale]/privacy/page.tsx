import type { Metadata } from 'next'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { BRAND_NAME } from '@/lib/brand'
import { PRIVACY_CONTACT_EMAIL, PRIVACY_CONTENT, PRIVACY_LAST_UPDATED } from '@/lib/privacy-content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const content = PRIVACY_CONTENT[hasLocale(routing.locales, locale) ? locale : routing.defaultLocale]
  return { title: `${content.title} · ${BRAND_NAME}` }
}

/** A plain reading page: the one place in the app that's text by design, kept narrow and calm. */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const content = PRIVACY_CONTENT[locale as AppLocale]
  const updated = new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'long' }).format(
    PRIVACY_LAST_UPDATED
  )

  return (
    <div className="min-h-dvh bg-background">
      <div className="safe-x safe-bottom mx-auto w-full max-w-2xl">
        <main className="flex flex-col gap-8 px-5 pb-16 pt-6 md:px-10 md:pt-10">
          <Link
            href="/"
            className="flex w-fit items-center gap-1 rounded-full py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronRight className="size-4 ltr:rotate-180" aria-hidden="true" />
            {content.backAction}
          </Link>

          <header className="flex flex-col gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary shadow-soft">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
            <p className="text-xs text-muted-foreground">
              {content.lastUpdated}: {updated}
            </p>
            <p className="text-base leading-relaxed text-foreground/80">{content.intro}</p>
          </header>

          {content.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              {section.bullets ? (
                <ul className="flex flex-col gap-2.5 ps-5">
                  {section.body.map((line) => (
                    <li key={line} className="list-disc text-sm leading-relaxed text-foreground/80 marker:text-primary/60">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                section.body.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-foreground/80">
                    {line}
                  </p>
                ))
              )}
            </section>
          ))}

          <section className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-soft">
            <h2 className="text-base font-semibold">{content.contactTitle}</h2>
            <p className="text-sm text-foreground/80">{content.contactBody}</p>
            <a
              href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
              dir="ltr"
              className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {PRIVACY_CONTACT_EMAIL}
            </a>
          </section>
        </main>
      </div>
    </div>
  )
}
