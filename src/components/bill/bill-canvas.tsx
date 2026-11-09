'use client'

import { cn } from '@/lib/utils'
import { useBillStore } from '@/lib/store/bill-store'
import { AppHeader } from './app-header'
import { ConfirmPaymentSection } from './confirm-payment-section'
import { ItemsSection } from './items-section'
import { LiveSummarySection } from './live-summary-section'
import { PayingPartiesSection } from './paying-parties-section'

export function BillCanvas() {
  const bill = useBillStore((s) => s.bill)

  if (!bill) return null

  return (
    // Nested layers on purpose: the safe-* utilities set padding themselves, so sharing one
    // element with px-*/pt-*/pb-* makes them override each other (the design padding silently
    // computed to 0). Outer layers = device insets, inner layers = design spacing.
    <div className="safe-bottom safe-x mx-auto flex min-h-dvh w-full max-w-[1920px] flex-col">
      {/* Sticky and fully opaque below lg: iOS 26 draws a system blur under the status bar of
          installed web apps that CSS can't turn off, so page content must scroll beneath this
          bar rather than carrying the header up into that blur. Not sticky from lg up, where
          the summary column has its own sticky offset and there's no status bar. */}
      <div className="safe-top sticky top-0 z-30 bg-background lg:static lg:bg-transparent">
        <div className="px-5 pt-4 pb-3 md:px-10 md:pt-6 lg:px-14 lg:pb-0 xl:px-20">
          <AppHeader />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-10 md:px-10 lg:px-14 xl:px-20">
        {/* A smaller gap here than between the sections below — the header is chrome, not
            content, so it shouldn't push the first section down as far as the sections
            push each other apart. From lg up, this becomes two columns: participants+dishes
            on the left (the part that scrolls), tip/summary sticky on the right — so a long
            dish list never pushes the total and per-person amounts out of view the way it can
            on a single mobile-width column. With no dishes yet there is no summary to show, so
            the first column takes the full width instead of leaving half the screen empty. */}
        <div
          className={cn(
            'mt-1 flex flex-col gap-6 lg:mt-5',
            bill.items.length > 0 && 'lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-14'
          )}
        >
          <div className="flex flex-col gap-6">
            <PayingPartiesSection bill={bill} />
            <ItemsSection bill={bill} />
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-8">
            <LiveSummarySection bill={bill} />
            <ConfirmPaymentSection bill={bill} />
          </div>
        </div>
      </div>
    </div>
  )
}
