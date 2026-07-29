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
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-start shadow-soft transition-transform active:scale-[0.98]"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">
          {item.name}
          {item.quantity > 1 && <span className="text-muted-foreground"> ×{item.quantity}</span>}
        </span>
        <span className="text-sm text-muted-foreground">{formatCurrency(lineTotal, bill.currency)}</span>
      </div>

      <ItemAvatarStack diners={sharedByDiners} positions={positions} />
    </button>
  )
}
