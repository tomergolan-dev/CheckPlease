import { getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { DinerAvatar } from './diner-avatar'
import { DINER_VIBRANT_CLASSES } from './diner-display'
import { useDinerLabel } from './use-diner-label'

/**
 * Read-only diner display for a completed bill's "My Bills" detail view — deliberately not a
 * reuse of PayingPartiesSection/DinerChip, whose `onOpen` wires straight into the live active
 * draft's edit sheets via useBillStore. Reusing them here would silently let a viewer edit the
 * historical bill's diners through what looks like a display-only screen.
 */
export function CompletedBillDinersList({ bill }: { bill: Bill }) {
  const dinerLabel = useDinerLabel()
  const positions = getDinerDefaultPositions(bill.diners)

  return (
    <div className="flex flex-wrap gap-3">
      {bill.diners.map((diner) => (
        <div key={diner.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5 py-1">
          <span className="relative inline-flex">
            <DinerAvatar diner={diner} defaultPosition={positions[diner.id]} size={56} className="ring-2 ring-card" />
            {diner.partySize > 1 && (
              <span
                className={`absolute -end-1 -bottom-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-card ${DINER_VIBRANT_CLASSES[diner.color]}`}
              >
                {diner.partySize}
              </span>
            )}
          </span>
          <span className="w-full truncate text-center text-xs font-medium">
            {dinerLabel(diner, positions[diner.id])}
          </span>
        </div>
      ))}
    </div>
  )
}
