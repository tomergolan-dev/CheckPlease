import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { SettingsMenu } from '@/components/shared/settings-menu'
import { BRAND_NAME } from '@/lib/brand'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HomeContent />
}

function HomeContent() {
  const t = useTranslations('App')
  const tHome = useTranslations('Home')

  return (
    <div className="safe-top safe-bottom safe-x flex min-h-dvh flex-col">
      <header className="flex items-center justify-end px-4 py-4">
        <SettingsMenu />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{BRAND_NAME}</h1>
          <p className="text-muted-foreground text-base">{t('tagline')}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card px-6 py-4 shadow-soft">
          <p className="text-muted-foreground text-sm">{tHome('comingSoon')}</p>
        </div>
      </main>
    </div>
  )
}
