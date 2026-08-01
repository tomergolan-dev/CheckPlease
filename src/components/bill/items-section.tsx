'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, UtensilsCrossed } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconBadge } from '@/components/shared/icon-badge'
import { SectionHeading } from '@/components/shared/section-heading'
import { getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AddItemSheet } from './add-item-sheet'
import { EditItemSheet } from './edit-item-sheet'
import { ItemRow } from './item-row'
import { ScanReceiptSheet } from './scan-receipt-sheet'

/** Past this many dishes, the list collapses to a preview so a long bill doesn't force
 * scrolling past everything just to reach the tip/summary below. */
const COLLAPSE_THRESHOLD = 5

export function ItemsSection({ bill }: { bill: Bill }) {
  const t = useTranslations('Items')
  const shouldReduceMotion = useReducedMotion()
  const positions = useMemo(() => getDinerDefaultPositions(bill.diners), [bill.diners])
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const sortedItems = useMemo(
    () => bill.items.slice().sort((a, b) => a.sortIndex - b.sortIndex),
    [bill.items]
  )

  const canCollapse = sortedItems.length > COLLAPSE_THRESHOLD
  const visibleItems =
    canCollapse && !showAll ? sortedItems.slice(0, COLLAPSE_THRESHOLD) : sortedItems

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading icon={UtensilsCrossed} title={t('title')} tone="amber" />

      <div className="flex flex-col gap-3">
        {/* Kept first, not last — stays one tap away regardless of how long the list grows. */}
        <div className="flex gap-3">
          <ScanReceiptSheet />
          <AddItemSheet />
        </div>

        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 px-6 py-8 text-center">
            <IconBadge icon={UtensilsCrossed} tone="amber" size="lg" />
            <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[22px] border border-border/40 bg-card shadow-soft">
            <div className="flex flex-col divide-y divide-border/40">
              <AnimatePresence initial={false}>
                {visibleItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={
                      shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 26 }
                    }
                  >
                    <ItemRow item={item} bill={bill} positions={positions} onOpen={setEditItemId} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {canCollapse && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="flex w-full items-center justify-center gap-1 border-t border-border/40 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                {showAll ? t('showLess') : t('showMore')}
                <ChevronDown
                  className={`size-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        )}
      </div>

      <EditItemSheet bill={bill} itemId={editItemId} onOpenChange={(open) => !open && setEditItemId(null)} />
    </section>
  )
}
