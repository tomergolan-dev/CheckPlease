'use client'

import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { AccountAvatar } from './account-avatar'

type Mode = 'sign-in' | 'create'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.27-2.09 3.58-5.17 3.58-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.89-3.02c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.11C3.26 21.3 7.31 24 12 24Z"
      />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11Z" />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  )
}

export function AccountSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('Account')
  const tCommon = useTranslations('Common')
  const { data: session } = useSession()
  const user = session?.user

  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setMode('sign-in')
    setEmail('')
    setPassword('')
    setError(null)
    setSubmitting(false)
  }

  async function handleGoogle() {
    setSubmitting(true)
    await signIn('google')
  }

  async function handleCredentialsSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'create') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null)
          const code = body && typeof body === 'object' && 'error' in body ? body.error : null
          setError(code === 'email_taken' ? t('emailTaken') : t('genericError'))
          setSubmitting(false)
          return
        }
      }

      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError(t('invalidCredentials'))
        setSubmitting(false)
        return
      }
      onOpenChange(false)
    } catch {
      setError(t('genericError'))
      setSubmitting(false)
    }
  }

  const canSubmit = mode === 'create' ? email.trim().length > 0 && password.length >= 8 : email.trim().length > 0 && password.length > 0

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
        if (!next) resetForm()
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{mode === 'create' ? t('createAccountAction') : t('signInTitle')}</DrawerTitle>
          <DrawerDescription>{t('signInSubtitle')}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-8">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <GoogleIcon className="size-4" />
            {t('continueWithGoogle')}
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t('orDivider')}
            <span className="h-px flex-1 bg-border" />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">{t('emailLabel')}</span>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">{t('passwordLabel')}</span>
            <Input
              type="password"
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'create' && <span className="text-xs text-muted-foreground">{t('passwordHint')}</span>}
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button onClick={handleCredentialsSubmit} disabled={!canSubmit || submitting}>
            {mode === 'create' ? t('createAccountAction') : t('signInAction')}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'create' ? 'sign-in' : 'create')
              setError(null)
            }}
            className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {mode === 'create' ? (
              <>
                {t('signInPrompt')} <span className="font-medium text-primary">{t('signInAction')}</span>
              </>
            ) : (
              <>
                {t('createAccountPrompt')} <span className="font-medium text-primary">{t('createAccountAction')}</span>
              </>
            )}
          </button>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{tCommon('cancel')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
