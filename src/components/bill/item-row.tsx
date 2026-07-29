import { formatCurrency } from '@/lib/money'
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
  const sharedByDiners = bill.diners.filter((diner) => item.sharedBy.includes(diner.id))
  const lineTotal = item.unitPriceMinorUnits * item.quantity

  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-3 py-2.5 text-start shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">
          {item.name}
          {item.quantity > 1 && <span className="text-muted-foreground"> ×{item.quantity}</span>}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatCurrency(lineTotal, bill.currency)}
        </span>
      </div>

      <ItemAvatarStack diners={sharedByDiners} positions={positions} />
    </button>
  )
}
