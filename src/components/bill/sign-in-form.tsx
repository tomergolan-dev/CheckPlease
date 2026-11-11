'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GoogleIcon } from '@/components/shared/google-icon'
import { PasswordInput } from '@/components/shared/password-input'

/**
 * 'verify' is the emailed-code step that follows creating an account (or signing in before
 * verifying). 'forgot' asks where to send a reset code, and 'reset' takes it with the new password.
 * 'verified' and 'reset-done' are completion screens, shown once the user is already signed in.
 */
export type SignInFormMode = 'sign-in' | 'create' | 'verify' | 'verified' | 'forgot' | 'reset' | 'reset-done'

type AccountTitleKey = 'verifiedTitle' | 'verifyEmailTitle' | 'createAccountAction' | 'resetPasswordTitle' | 'resetDoneTitle'

/** The sheet title for a mode, from the Account messages; `null` means the sheet's own sign-in title. */
export function signInFormTitleKey(mode: SignInFormMode): AccountTitleKey | null {
  switch (mode) {
    case 'verified':
      return 'verifiedTitle'
    case 'verify':
      return 'verifyEmailTitle'
    case 'create':
      return 'createAccountAction'
    case 'forgot':
    case 'reset':
      return 'resetPasswordTitle'
    case 'reset-done':
      return 'resetDoneTitle'
    default:
      return null
  }
}

/** Whether the sheet's own subtitle belongs above this mode (only the first sign-in screens). */
export function signInFormShowsSubtitle(mode: SignInFormMode): boolean {
  return mode === 'sign-in' || mode === 'create'
}

/** Completion screens: the user is signed in already, but the sheet stays until they continue. */
export function signInFormIsDone(mode: SignInFormMode): boolean {
  return mode === 'verified' || mode === 'reset-done'
}

const RESEND_SECONDS = 60

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
  const locale = useLocale()

  const [mode, setMode] = useState<SignInFormMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  function changeMode(next: SignInFormMode) {
    setMode(next)
    setError(null)
    setNotice(null)
    onModeChange?.(next)
  }

  function enterVerify() {
    setCode('')
    setResendIn(RESEND_SECONDS)
    changeMode('verify')
  }

  /** Errors from sending a code, in words; `null` when it went out (or one just did). */
  function sendErrorMessage(codeName: unknown): string | null {
    if (codeName === 'too_many') return t('codeTooManySends')
    if (codeName === 'email_failed') return t('codeEmailFailed')
    return null
  }

  async function requestCode(endpoint = '/api/auth/send-code'): Promise<boolean> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, locale }),
    }).catch(() => null)
    if (!response) {
      setError(t('genericError'))
      return false
    }
    if (response.ok) return true
    const body: unknown = await response.json().catch(() => null)
    const reason = body && typeof body === 'object' && 'error' in body ? body.error : null
    // A cooldown means a code went out within the last minute; that code still works.
    if (reason === 'cooldown') return true
    setError(sendErrorMessage(reason) ?? t('genericError'))
    return false
  }

  async function handleResend() {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const sent = await requestCode(mode === 'reset' ? '/api/auth/forgot-password' : undefined)
    setSubmitting(false)
    if (sent) {
      setCode('')
      setResendIn(RESEND_SECONDS)
      setNotice(t('codeResent'))
    }
  }

  async function handleVerify(value: string) {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: value }),
      })
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const reason = body && typeof body === 'object' && 'error' in body ? body.error : null
        // Only a 400 is about the code itself; anything else is the server, and retrying the
        // same code is the right next step, so it's kept in the field.
        if (response.status !== 400) {
          setError(t('genericError'))
          setSubmitting(false)
          return
        }
        setError(reason === 'expired' ? t('codeExpired') : reason === 'too_many_attempts' ? t('codeTooManyAttempts') : t('codeInvalid'))
        setCode('')
        setSubmitting(false)
        return
      }
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError(t('genericError'))
        setSubmitting(false)
        return
      }
      // Signed in already; this screen just says registration is complete before moving on.
      setSubmitting(false)
      changeMode('verified')
    } catch {
      setError(t('genericError'))
      setSubmitting(false)
    }
  }

  async function handleForgotSubmit() {
    setError(null)
    setSubmitting(true)
    const sent = await requestCode('/api/auth/forgot-password')
    setSubmitting(false)
    if (!sent) return
    setCode('')
    setPassword('')
    setConfirmPassword('')
    setResendIn(RESEND_SECONDS)
    changeMode('reset')
  }

  async function handleReset() {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      })
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const reason = body && typeof body === 'object' && 'error' in body ? body.error : null
        if (response.status !== 400) {
          // The server, not the code: keep everything typed so trying again is one tap.
          setError(t('genericError'))
        } else if (reason === 'email_taken') {
          setError(t('emailTaken'))
        } else {
          setError(reason === 'expired' ? t('codeExpired') : reason === 'too_many_attempts' ? t('codeTooManyAttempts') : t('codeInvalid'))
          setCode('')
        }
        setSubmitting(false)
        return
      }
      const result = await signIn('credentials', { email, password, redirect: false })
      setSubmitting(false)
      if (result?.error) {
        // Saved, but signing in didn't go through: the new password works from the sign-in screen.
        changeMode('sign-in')
        setNotice(t('resetSavedSignIn'))
        return
      }
      changeMode('reset-done')
    } catch {
      setError(t('genericError'))
      setSubmitting(false)
    }
  }

  function startForgot() {
    setCode('')
    changeMode('forgot')
  }

  function handleCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    // Six digits is the whole code, so it checks itself; no extra tap.
    if (mode === 'verify' && digits.length === 6 && !submitting) void handleVerify(digits)
  }

  function toggleMode() {
    setConfirmPassword('')
    changeMode(mode === 'create' ? 'sign-in' : 'create')
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
          body: JSON.stringify({ email, password, locale }),
        })
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null)
          const reason = body && typeof body === 'object' && 'error' in body ? body.error : null
          setError(reason === 'email_taken' ? t('emailTaken') : (sendErrorMessage(reason) ?? t('genericError')))
          setSubmitting(false)
          return
        }
        setSubmitting(false)
        enterVerify()
        return
      }

      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.code === 'email_not_verified') {
        // Right password, email not confirmed yet: send a fresh code and ask for it.
        const sent = await requestCode()
        setSubmitting(false)
        if (sent) enterVerify()
        return
      }
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

  const passwordLongEnough = password.length >= 8

  // Flagged only once the confirmation is as long as the password, so it never nags mid-typing.
  const choosingPassword = mode === 'create' || mode === 'reset'
  const passwordsMismatch =
    choosingPassword && confirmPassword.length >= password.length && confirmPassword.length > 0 && confirmPassword !== password

  const canSubmit =
    mode === 'create'
      ? email.trim().length > 0 && password.length >= 8 && confirmPassword === password
      : email.trim().length > 0 && password.length > 0

  if (signInFormIsDone(mode)) {
    return (
      <div className="flex flex-col items-center gap-4 px-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-[#e8f5ee] text-[#2a8a5f]">
          <Check className="size-7" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mode === 'reset-done' ? t('resetDoneDescription') : t('verifiedDescription')}
        </p>
        <Button className="w-full" onClick={onSuccess}>
          {t('verifiedAction')}
        </Button>
      </div>
    )
  }

  const linkClass =
    'rounded-md py-1 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:no-underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

  /** The new password, its live length hint and its confirmation: creating an account, or resetting. */
  const newPasswordFields = (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{mode === 'reset' ? t('newPasswordLabel') : t('passwordLabel')}</span>
        <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {/* Live, never red: gray until the length is met, then green with a check. A field the
            user is still typing in isn't an error. */}
        <span
          className={`flex items-center gap-1 text-xs transition-colors ${passwordLongEnough ? 'text-[#2a8a5f]' : 'text-muted-foreground'}`}
        >
          {passwordLongEnough && <Check className="size-3.5" aria-hidden="true" />}
          {t('passwordHint')}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">{t('confirmPasswordLabel')}</span>
        <PasswordInput
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-invalid={passwordsMismatch || undefined}
        />
        {passwordsMismatch && <span className="text-xs text-destructive">{t('passwordsMismatch')}</span>}
      </label>
    </>
  )

  if (mode === 'forgot') {
    return (
      <div className="flex flex-col gap-4 px-8">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">{t('forgotDescription')}</p>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{t('emailLabel')}</span>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleForgotSubmit} disabled={email.trim().length === 0 || submitting}>
          {t('sendCodeAction')}
        </Button>
        <button type="button" onClick={() => changeMode('sign-in')} disabled={submitting} className={`self-center text-sm ${linkClass}`}>
          {t('backToSignIn')}
        </button>
      </div>
    )
  }

  if (mode === 'reset') {
    const canReset = code.length === 6 && passwordLongEnough && confirmPassword === password
    return (
      <div className="flex flex-col gap-4 px-8">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {t('codeSentTo')}
          <br />
          <span dir="ltr" className="font-medium text-foreground">
            {email}
          </span>
        </p>

        <Input
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label={t('codeLabel')}
          disabled={submitting}
          dir="ltr"
          placeholder="••••••"
          className="h-14 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums md:text-2xl"
        />

        {newPasswordFields}

        {error && (
          <p role="alert" className="text-center text-xs text-destructive">
            {error}
          </p>
        )}
        {notice && !error && <p className="text-center text-xs text-[#2a8a5f]">{notice}</p>}

        <Button onClick={handleReset} disabled={!canReset || submitting}>
          {t('resetAction')}
        </Button>

        <div className="flex flex-col items-center gap-1 text-sm">
          <button type="button" onClick={handleResend} disabled={resendIn > 0 || submitting} className={linkClass}>
            {resendIn > 0 ? t('resendCodeIn', { seconds: resendIn }) : t('resendCodeAction')}
          </button>
          <button type="button" onClick={() => changeMode('sign-in')} disabled={submitting} className={linkClass}>
            {t('backToSignIn')}
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'verify') {
    return (
      <div className="flex flex-col gap-4 px-8">
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {t('codeSentTo')}
          <br />
          <span dir="ltr" className="font-medium text-foreground">
            {email}
          </span>
        </p>

        <Input
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label={t('codeLabel')}
          aria-invalid={error ? true : undefined}
          disabled={submitting}
          dir="ltr"
          placeholder="••••••"
          className="h-14 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums md:text-2xl"
        />

        {error && (
          <p role="alert" className="text-center text-xs text-destructive">
            {error}
          </p>
        )}
        {notice && !error && <p className="text-center text-xs text-[#2a8a5f]">{notice}</p>}

        <Button onClick={() => handleVerify(code)} disabled={code.length !== 6 || submitting}>
          {t('verifyAction')}
        </Button>

        <div className="flex flex-col items-center gap-1 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendIn > 0 || submitting}
            className="rounded-md py-1 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:no-underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {resendIn > 0 ? t('resendCodeIn', { seconds: resendIn }) : t('resendCodeAction')}
          </button>
          <button
            type="button"
            onClick={() => changeMode('create')}
            disabled={submitting}
            className="rounded-md py-1 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t('changeEmailAction')}
          </button>
        </div>
      </div>
    )
  }

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

      {mode === 'create' ? (
        newPasswordFields
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">{t('passwordLabel')}</span>
            <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="button" onClick={startForgot} disabled={submitting} className={`self-end text-xs ${linkClass}`}>
            {t('forgotPasswordLink')}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      {notice && !error && <p className="text-xs text-[#2a8a5f]">{notice}</p>}

      <Button onClick={handleCredentialsSubmit} disabled={!canSubmit || submitting}>
        {mode === 'create' ? t('createAccountAction') : t('signInAction')}
      </Button>

      <button
        type="button"
        onClick={toggleMode}
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
  )
}
