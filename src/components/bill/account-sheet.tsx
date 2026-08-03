'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { RESUME_SCAN_KEY } from '@/lib/scan-resume'
import { AccountAvatar } from './account-avatar'
import { CreditPackSheet } from './credit-pack-sheet'
import { SignInForm, type SignInFormMode } from './sign-in-form'

export function AccountSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('Account')
  const tCredits = useTranslations('Credits')
  const tCommon = useTranslations('Common')
  const { data: session } = useSession()
  const user = session?.user

  const [mode, setMode] = useState<SignInFormMode>('sign-in')
  const [balance, setBalance] = useState<number | null>(null)
  const [packSheetOpen, setPackSheetOpen] = useState(false)

  useEffect(() => {
    if (!user || !open) return
    let cancelled = false
    fetch('/api/credits/balance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return
        const value = data && typeof data === 'object' && 'balance' in data ? data.balance : null
        if (typeof value === 'number') setBalance(value)
      })
      .catch(() => {
        // A stale/missing balance display is a minor cosmetic gap, not worth surfacing as an
        // error — the credit-gated scan flow itself always reads the balance fresh server-side.
      })
    return () => {
      cancelled = true
    }
  }, [user, open])

  if (user) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('accountAction')}</DrawerTitle>
            </DrawerHeader>

            <div className="flex flex-col items-center gap-3 px-8 py-2">
              <AccountAvatar user={user} size={56} />
              <p className="text-sm text-muted-foreground">{t('signedInAs', { email: user.email ?? '' })}</p>
              {balance !== null && (
                <p className="text-sm font-medium">{tCredits('balanceLabel', { count: balance })}</p>
              )}
            </div>

            <DrawerFooter>
              <Button variant="outline" onClick={() => setPackSheetOpen(true)}>
                {tCredits('buyCreditsAction')}
              </Button>
              <Button variant="outline" onClick={() => signOut()}>
                {t('signOutAction')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <CreditPackSheet open={packSheetOpen} onOpenChange={setPackSheetOpen} />
      </>
    )
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setMode('sign-in')
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{mode === 'create' ? t('createAccountAction') : t('signInTitle')}</DrawerTitle>
          <DrawerDescription>{t('signInSubtitle')}</DrawerDescription>
        </DrawerHeader>

        <SignInForm
          key={open ? 'open' : 'closed'}
          onSuccess={() => onOpenChange(false)}
          onModeChange={setMode}
          // Hygiene, not a resume path of its own — clears a stale scan-gate flag if the user
          // signs in through the header instead of finishing a scan-gate attempt, so an
          // abandoned attempt can never resurrect a scan sheet the user didn't ask to reopen.
          onBeforeGoogleRedirect={() => sessionStorage.removeItem(RESUME_SCAN_KEY)}
        />

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{tCommon('cancel')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
