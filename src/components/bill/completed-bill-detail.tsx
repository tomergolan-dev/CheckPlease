import { UtensilsCrossed, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SectionHeading } from '@/components/shared/section-heading'
import type { Bill } from '@/lib/store/types'
import { CompletedBillDinersList } from './completed-bill-diners-list'
import { CompletedBillItemsList } from './completed-bill-items-list'
import { LiveSummarySection } from './live-summary-section'

/**
 * Display-only: diners/items/tip/rounding/final payments for one completed bill. `LiveSummarySection`
 * is safely reused as-is (pure `{ bill }` presentational component, no store access of its own);
 * the diner/item lists are not, since their editable counterparts wire straight into the live
 * active draft — see the comments on CompletedBillDinersList/CompletedBillItemsList.
 */
export function CompletedBillDetail({ bill }: { bill: Bill }) {
  const tDiners = useTranslations('Diners')
  const tItems = useTranslations('Items')

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <SectionHeading icon={Users} title={tDiners('title')} tone="blue" />
        <CompletedBillDinersList bill={bill} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading icon={UtensilsCrossed} title={tItems('title')} tone="amber" />
        <CompletedBillItemsList bill={bill} />
      </section>

      <LiveSummarySection bill={bill} />
    </div>
  )
}
