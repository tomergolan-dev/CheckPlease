'use client'

import { useBillStore } from '@/lib/store/bill-store'
import { AppHeader } from './app-header'
import { ItemsSection } from './items-section'
import { LiveSummarySection } from './live-summary-section'
import { PayingPartiesSection } from './paying-parties-section'

export function BillCanvas() {
  const bill = useBillStore((s) => s.bill)

  if (!bill) return null

  return (
    <div className="safe-top safe-bottom safe-x flex min-h-dvh flex-col px-8 pt-4 pb-10 lg:px-12 xl:px-16">
      <AppHeader />
      {/* A smaller gap here than between the sections below — the header is chrome, not
          content, so it shouldn't push the first section down as far as the sections
          push each other apart. From lg up, this becomes two columns: participants+dishes
          on the left (the part that scrolls), tip/summary sticky on the right — so a long
          dish list never pushes the total and per-person amounts out of view the way it can
          on a single mobile-width column. */}
      <div className="mt-4 flex flex-col gap-8 lg:mt-6 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-10 xl:gap-14">
        <div className="flex flex-col gap-8">
          <PayingPartiesSection bill={bill} />
          <ItemsSection bill={bill} />
        </div>

        <div className="lg:sticky lg:top-8">
          <LiveSummarySection bill={bill} />
        </div>
      </div>
    </div>
  )
}
