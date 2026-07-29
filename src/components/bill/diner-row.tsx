'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Stepper } from '@/components/shared/stepper'
import { useBillStore } from '@/lib/store/bill-store'
import type { Diner } from '@/lib/store/types'
import { DinerAvatar } from './diner-avatar'

interface DinerRowProps {
  diner: Diner
  defaultPosition?: number
  onRequestRemove: (dinerId: string) => void
}

export function DinerRow({ diner, defaultPosition, onRequestRemove }: DinerRowProps) {
  const t = useTranslations('Diners')
  const tCommon = useTranslations('Common')
  const renameDiner = useBillStore((s) => s.renameDiner)
  const setDinerPartySize = useBillStore((s) => s.setDinerPartySize)

  const displayName = diner.name ?? t('defaultLabel', { number: defaultPosition ?? 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(displayName)

  function commit() {
    renameDiner(diner.id, draftName)
    setIsEditing(false)
  }

  function cancel() {
    setDraftName(displayName)
    setIsEditing(false)
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-soft">
      <DinerAvatar diner={diner} defaultPosition={defaultPosition} />

      {isEditing ? (
        <Input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') cancel()
          }}
          className="h-8 flex-1"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraftName(displayName)
            setIsEditing(true)
          }}
          className="flex-1 truncate text-start text-sm font-medium"
        >
          {displayName}
        </button>
      )}

      <Stepper
        value={diner.partySize}
        onChange={(size) => setDinerPartySize(diner.id, size)}
        label={t('partySizeLabel')}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={tCommon('remove')}
        onClick={() => onRequestRemove(diner.id)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
