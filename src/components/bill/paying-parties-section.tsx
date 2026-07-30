'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SectionHeading } from '@/components/shared/section-heading'
import { useBillStore } from '@/lib/store/bill-store'
import { getDinerDefaultPositions } from '@/lib/store/selectors'
import type { Bill } from '@/lib/store/types'
import { AddDinerControl } from './add-diner-control'
import { DinerChip } from './diner-chip'
import { DinerEditSheet } from './diner-edit-sheet'
import { RemoveDinerSheet } from './remove-diner-sheet'
import { useDinerLabel } from './use-diner-label'

export function PayingPartiesSection({ bill }: { bill: Bill }) {
  const t = useTranslations('Diners')
  const dinerLabel = useDinerLabel()
  const addDiner = useBillStore((s) => s.addDiner)
  const shouldReduceMotion = useReducedMotion()

  const positions = useMemo(() => getDinerDefaultPositions(bill.diners), [bill.diners])
  const [editDinerId, setEditDinerId] = useState<string | null>(null)
  const [removeDinerId, setRemoveDinerId] = useState<string | null>(null)
  const editingDiner = bill.diners.find((d) => d.id === editDinerId) ?? null

  // Reduce first-tap friction: a fresh bill starts with one diner already in place.
  useEffect(() => {
    if (bill.diners.length === 0) {
      addDiner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading icon={Users} title={t('title')} tone="blue" />

      <div className="flex flex-wrap items-center gap-2">
        <AnimatePresence initial={false}>
          {bill.diners.map((diner) => (
            <motion.div
              key={diner.id}
              layout
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
              transition={
                shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 22 }
              }
            >
              <DinerChip
                diner={diner}
                label={dinerLabel(diner, positions[diner.id])}
                defaultPosition={positions[diner.id]}
                onOpen={() => setEditDinerId(diner.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <AddDinerControl hasExistingItems={bill.items.length > 0} />
      </div>

      <DinerEditSheet
        diner={editingDiner}
        defaultPosition={editDinerId ? positions[editDinerId] : undefined}
        canRemove={bill.diners.length > 1}
        onOpenChange={(open) => !open && setEditDinerId(null)}
        onRequestRemove={setRemoveDinerId}
      />

      <RemoveDinerSheet
        bill={bill}
        dinerId={removeDinerId}
        onOpenChange={(open) => !open && setRemoveDinerId(null)}
      />
    </section>
  )
}
