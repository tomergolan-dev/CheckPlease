'use client'

import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * The header's only action: opens the menu holding the account, credits, My Bills, starting a
 * new bill and language. Always the plain menu icon, signed in or not, never a profile photo.
 */
export function AccountButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations('Account')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('menuTitle')}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-foreground/70 shadow-soft transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-elevated active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Menu className="size-5" aria-hidden="true" />
    </button>
  )
}
