'use client'

import { useMemo, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
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

export function ItemsSection({ bill }: { bill: Bill }) {
  const t = useTranslations('Items')
  const shouldReduceMotion = useReducedMotion()
  const positions = useMemo(() => getDinerDefaultPositions(bill.diners), [bill.diners])
  const [editItemId, setEditItemId] = useState<string | null>(null)

  const sortedItems = useMemo(
    () => bill.items.slice().sort((a, b) => a.sortIndex - b.sortIndex),
    [bill.items]
  )

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading icon={UtensilsCrossed} title={t('title')} tone="amber" />

      <div className="flex flex-col gap-2">
        {/* Kept first, not last — stays one tap away regardless of how long the list grows. */}
        <div className="flex flex-wrap gap-2">
          <AddItemSheet />
          <ScanReceiptSheet />
        </div>

        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/40 px-6 py-8 text-center">
            <IconBadge icon={UtensilsCrossed} tone="amber" size="lg" />
            <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sortedItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.97 }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 26 }
                }
              >
                <ItemRow item={item} bill={bill} positions={positions} onOpen={setEditItemId} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <EditItemSheet bill={bill} itemId={editItemId} onOpenChange={(open) => !open && setEditItemId(null)} />
    </section>
  )
}
