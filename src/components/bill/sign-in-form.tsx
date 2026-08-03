'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleIcon } from '@/components/shared/google-icon'

export type SignInFormMode = 'sign-in' | 'create'

interface SignInFormProps {
  /** Fires after a successful *credentials* sign-in (redirect:false) — Google's success can't be
   * observed client-side before its full-page redirect fires, so this never fires for that path. */
  onSuccess: () => void
  /** Fires synchronously right before signIn('google')'s full-page navigation, so a caller can
   * persist any intent it needs to survive the redirect. */
  onBeforeGoogleRedirect?: () => void
  /** Fires whenever the sign-in/create-account mode toggles, so a caller whose own header/title
   * depends on the mode (e.g. "Sign in" vs "Create account") can stay in sync. */
  onModeChange?: (mode: SignInFormMode) => void
}

/**
 * Google button + divider + email/password fields + mode toggle + error handling — shared by
 * both the header's AccountSheet and ScanReceiptSheet's sign-in gate, so the two never drift out
 * of sync. Owns all of its own form state; a parent that needs a fresh form on reopen should
 * remount this with a `key` rather than threading an imperative reset.
 */
export function SignInForm({ onSuccess, onBeforeGoogleRedirect, onModeChange }: SignInFormProps) {
  const t = useTranslations('Account')

  const [mode, setMode] = useState<SignInFormMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleMode() {
    const next: SignInFormMode = mode === 'create' ? 'sign-in' : 'create'
    setMode(next)
    setError(null)
    onModeChange?.(next)
  }

  async function handleGoogle() {
    setSubmitting(true)
    onBeforeGoogleRedirect?.()
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
      onSuccess()
    } catch {
      setError(t('genericError'))
      setSubmitting(false)
    }
  }

  const canSubmit =
    mode === 'create' ? email.trim().length > 0 && password.length >= 8 : email.trim().length > 0 && password.length > 0

  return (
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

      <button type="button" onClick={toggleMode} className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground">
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
  )
}
