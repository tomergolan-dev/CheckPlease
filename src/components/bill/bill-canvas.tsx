'use client'

import { useBillStore } from '@/lib/store/bill-store'
import { ItemsSection } from './items-section'
import { LiveSummarySection } from './live-summary-section'
import { PayingPartiesSection } from './paying-parties-section'

export function BillCanvas() {
  const bill = useBillStore((s) => s.bill)

  if (!bill) return null

  return (
    <div className="safe-top safe-bottom safe-x flex min-h-dvh flex-col gap-8 px-4 py-8">
      <PayingPartiesSection bill={bill} />
      <ItemsSection bill={bill} />
      <LiveSummarySection bill={bill} />
    </div>
  )
}
