'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, LogIn, ReceiptText, RotateCcw, type LucideIcon } from 'lucide-react'
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
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { RESUME_SCAN_KEY } from '@/lib/scan-resume'
import { CreditPackSheet } from './credit-pack-sheet'
import { MyBillsSheet } from './my-bills-sheet'
import { SignInForm, type SignInFormMode } from './sign-in-form'

type View = 'menu' | 'sign-in' | 'sign-out'

const CARD = 'overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft'
const ROW =
  'flex min-h-14 w-full items-center gap-3 px-4 text-start text-sm font-medium transition-colors hover:bg-muted/40 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50'

function MenuRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={ROW}>
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 rtl:rotate-180" aria-hidden="true" />
    </button>
  )
}

/**
 * The one menu behind the header's single button: account and credits, My Bills, starting a new
 * bill, and language. `onStartNewBill` is omitted where there's no bill to restart (onboarding).
 */
export function AccountSheet({
  open,
  onOpenChange,
  onStartNewBill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartNewBill?: () => void
}) {
  const t = useTranslations('Account')
  const tApp = useTranslations('App')
  const tBills = useTranslations('Bills')
  const tCredits = useTranslations('Credits')
  const tCommon = useTranslations('Common')
  const tSettings = useTranslations('Settings')
  const { data: session } = useSession()
  const user = session?.user

  const [view, setView] = useState<View>('menu')
  const [signInMode, setSignInMode] = useState<SignInFormMode>('sign-in')
  const [balance, setBalance] = useState<number | null>(null)
  const [unlimitedCredits, setUnlimitedCredits] = useState(false)
  const [packSheetOpen, setPackSheetOpen] = useState(false)
  const [myBillsOpen, setMyBillsOpen] = useState(false)

  useEffect(() => {
    if (!user || !open) return
    let cancelled = false
    fetch('/api/credits/balance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return
        if (!data || typeof data !== 'object') return
        if ('balance' in data && typeof data.balance === 'number') setBalance(data.balance)
        if ('unlimited' in data && typeof data.unlimited === 'boolean') setUnlimitedCredits(data.unlimited)
      })
      .catch(() => {
        // A stale/missing balance display is a minor cosmetic gap, not worth surfacing as an
        // error — the credit-gated scan flow itself always reads the balance fresh server-side.
      })
    return () => {
      cancelled = true
    }
  }, [user, open])

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setView('menu')
      setSignInMode('sign-in')
    }
  }

  function close() {
    handleOpenChange(false)
  }

  function handleStartNewBill() {
    // Closes first, so the confirmation never stacks on top of the menu and the menu isn't left
    // open behind it once a new bill has started.
    close()
    onStartNewBill?.()
  }

  const balanceText =
    balance === null ? null : unlimitedCredits ? tCredits('unlimitedBalanceLabel') : tCredits('balanceLabel', { count: balance })

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          {view === 'sign-out' ? (
            <>
              <DrawerHeader>
                <DrawerTitle>{t('signOutConfirmTitle')}</DrawerTitle>
                <DrawerDescription>{t('signOutConfirmDescription')}</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button variant="destructive" onClick={() => signOut()}>
                  {t('signOutAction')}
                </Button>
                <Button variant="outline" onClick={() => setView('menu')}>
                  {tCommon('cancel')}
                </Button>
              </DrawerFooter>
            </>
          ) : view === 'sign-in' && !user ? (
            <>
              <DrawerHeader>
                <DrawerTitle>{signInMode === 'create' ? t('createAccountAction') : t('signInTitle')}</DrawerTitle>
                <DrawerDescription>{t('signInSubtitle')}</DrawerDescription>
              </DrawerHeader>
              <SignInForm
                onSuccess={close}
                onModeChange={setSignInMode}
                // Hygiene, not a resume path of its own — clears a stale scan-gate flag if the
                // user signs in from this menu instead of finishing a scan-gate attempt, so an
                // abandoned attempt can never resurrect a scan sheet the user didn't ask to reopen.
                onBeforeGoogleRedirect={() => sessionStorage.removeItem(RESUME_SCAN_KEY)}
              />
              <DrawerFooter>
                <Button variant="outline" onClick={() => setView('menu')}>
                  {tCommon('cancel')}
                </Button>
              </DrawerFooter>
            </>
          ) : (
            <>
              {/* The title says who this is: the email when signed in, otherwise "Not signed in?"
                  with what signing in adds. A generic "Menu" would only repeat the button. */}
              <DrawerHeader>
                <DrawerTitle className="truncate">{user ? user.email : t('menuSignInTitle')}</DrawerTitle>
                {!user && <DrawerDescription>{t('menuSignInHint')}</DrawerDescription>}
              </DrawerHeader>

              <div className="flex flex-col gap-3 px-4 pb-2">
                {user ? (
                  <div className={`${CARD} flex min-h-16 items-center gap-3 px-4 py-3`}>
                    <span className="flex-1 text-sm font-medium tabular-nums">{balanceText ?? '…'}</span>
                    {/* Filled orange; on hover it lightens with a deeper shadow but stays in place, so
                        it reads as an action to take rather than a selected state. */}
                    <button
                      type="button"
                      onClick={() => setPackSheetOpen(true)}
                      className="h-10 shrink-0 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {tCredits('buyCreditsShortAction')}
                    </button>
                  </div>
                ) : (
                  <div className={CARD}>
                    <MenuRow icon={LogIn} label={t('signInAction')} onClick={() => setView('sign-in')} />
                  </div>
                )}

                <div className={`${CARD} divide-y divide-border/40`}>
                  {onStartNewBill && <MenuRow icon={RotateCcw} label={tApp('newBillAction')} onClick={handleStartNewBill} />}
                  {user && <MenuRow icon={ReceiptText} label={tBills('myBillsAction')} onClick={() => setMyBillsOpen(true)} />}
                  <div className="flex min-h-14 items-center gap-3 ps-4 pe-2.5">
                    <span id="menu-language-label" className="flex-1 text-sm font-medium">
                      {tSettings('languageLabel')}
                    </span>
                    <LanguageSwitcher labelledBy="menu-language-label" onChange={close} />
                  </div>
                </div>
              </div>

              <DrawerFooter>
                {user ? (
                  // Quiet like "Remove diner": signing out deletes nothing, and it asks first anyway.
                  <button
                    type="button"
                    onClick={() => setView('sign-out')}
                    className="rounded-md py-1 text-center text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {t('signOutAction')}
                  </button>
                ) : (
                  <DrawerClose asChild>
                    <Button variant="outline">{tCommon('cancel')}</Button>
                  </DrawerClose>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {user && (
        <>
          <CreditPackSheet open={packSheetOpen} onOpenChange={setPackSheetOpen} />
          <MyBillsSheet open={myBillsOpen} onOpenChange={setMyBillsOpen} />
        </>
      )}
    </>
  )
}
