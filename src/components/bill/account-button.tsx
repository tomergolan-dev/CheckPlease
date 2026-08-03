'use client'

import { User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { AccountAvatar } from './account-avatar'

export function AccountButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations('Account')
  const { data: session } = useSession()
  const user = session?.user

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={user ? t('accountAction') : t('signInAction')}
      className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-card text-foreground/70 shadow-soft transition-all hover:-translate-y-0.5 hover:text-foreground hover:shadow-elevated active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/* Stays a plain neutral icon, matching the restart button beside it, until there's a
          real photo/initial to show — an account with nothing signed in yet isn't a "brand"
          moment worth an accent-tinted circle. */}
      {user ? <AccountAvatar user={user} size={36} /> : <User className="size-5" aria-hidden="true" />}
    </button>
  )
}
