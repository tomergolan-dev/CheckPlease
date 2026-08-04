import { ScanLine } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/money'
import { FoodIcon } from '@/lib/food-icon'
import { getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { ItemAvatarStack } from './item-avatar-stack'

/**
 * Read-only item display for a completed bill's "My Bills" detail view — deliberately not a
 * reuse of ItemsSection/ItemRow, whose row tap opens EditItemSheet, itself wired straight into
 * the live active draft via useBillStore. Reusing them here would silently let a viewer edit the
 * historical bill's items through what looks like a display-only screen.
 */
export function CompletedBillItemsList({ bill }: { bill: Bill }) {
  const t = useTranslations('Items')
  const positions = getDinerDefaultPositions(bill.diners)
  const sortedItems = bill.items.slice().sort((a, b) => a.sortIndex - b.sortIndex)

  return (
    <div className="flex flex-col divide-y divide-border/40 overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-soft">
      {sortedItems.map((item) => {
        const sharedByDiners = bill.diners.filter((diner) => item.sharedBy.includes(diner.id))
        const lineTotal = item.unitPriceMinorUnits * item.quantity
        return (
          <div key={item.id} className="flex w-full items-center gap-3 px-4 py-3">
            <FoodIcon dishName={item.name} />

            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {item.source === 'scanned' && (
                <ScanLine
                  role="img"
                  aria-label={t('scannedBadgeLabel')}
                  className="me-1 inline size-3.5 shrink-0 align-text-bottom text-muted-foreground/60"
                />
              )}
              {item.name}
              {item.quantity > 1 && <span className="text-muted-foreground"> ×{item.quantity}</span>}
            </span>

            <ItemAvatarStack diners={sharedByDiners} positions={positions} />

            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {formatCurrency(lineTotal, bill.currency)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
