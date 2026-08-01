import { ChevronRight, ScanLine } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/money'
import { FoodIcon } from '@/lib/food-icon'
import type { Bill, Item } from '@/lib/store/types'
import { ItemAvatarStack } from './item-avatar-stack'

export function ItemRow({
  item,
  bill,
  positions,
  onOpen,
}: {
  item: Item
  bill: Bill
  positions: Record<string, number>
  onOpen: (itemId: string) => void
}) {
  const t = useTranslations('Items')
  const sharedByDiners = bill.diners.filter((diner) => item.sharedBy.includes(diner.id))
  const lineTotal = item.unitPriceMinorUnits * item.quantity

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/40 active:bg-muted/60"
    >
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

      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 rtl:rotate-180" aria-hidden="true" />
    </button>
  )
}
