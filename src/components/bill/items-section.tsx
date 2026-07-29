'use client'

import { useMemo, useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SectionHeading } from '@/components/shared/section-heading'
import { getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AddItemSheet } from './add-item-sheet'
import { EditItemSheet } from './edit-item-sheet'
import { ItemRow } from './item-row'

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
      <SectionHeading icon={UtensilsCrossed} title={t('title')} />

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {sortedItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <ItemRow item={item} bill={bill} positions={positions} onOpen={setEditItemId} />
            </motion.div>
          ))}
        </AnimatePresence>

        <AddItemSheet />
      </div>

      <EditItemSheet bill={bill} itemId={editItemId} onOpenChange={(open) => !open && setEditItemId(null)} />
    </section>
  )
}
