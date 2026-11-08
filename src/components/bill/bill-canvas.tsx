'use client'

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
    // Two nested layers on purpose: the safe-* utilities set padding themselves, so sharing one
    // element with px-*/pt-*/pb-* makes them override each other (the design padding silently
    // computed to 0). Outer layer = device insets, inner layer = design spacing.
    <div className="safe-top safe-bottom safe-x flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col px-5 pt-4 pb-10 md:px-10 md:pt-6 lg:px-14 xl:px-20">
        <AppHeader />
        {/* A smaller gap here than between the sections below — the header is chrome, not
            content, so it shouldn't push the first section down as far as the sections
            push each other apart. From lg up, this becomes two columns: participants+dishes
            on the left (the part that scrolls), tip/summary sticky on the right — so a long
            dish list never pushes the total and per-person amounts out of view the way it can
            on a single mobile-width column. */}
        <div className="mt-4 flex flex-col gap-6 lg:mt-5 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-10 xl:gap-14">
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
