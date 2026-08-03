'use client'

import { useState } from 'react'
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
import { SignInForm, type SignInFormMode } from './sign-in-form'

export function AccountSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('Account')
  const tCommon = useTranslations('Common')
  const { data: session } = useSession()
  const user = session?.user

  const [mode, setMode] = useState<SignInFormMode>('sign-in')

  if (user) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('accountAction')}</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col items-center gap-3 px-8 py-2">
            <AccountAvatar user={user} size={56} />
            <p className="text-sm text-muted-foreground">{t('signedInAs', { email: user.email ?? '' })}</p>
          </div>

          <DrawerFooter>
            <Button variant="outline" onClick={() => signOut()}>
              {t('signOutAction')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
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
