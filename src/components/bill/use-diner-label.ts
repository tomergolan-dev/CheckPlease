'use client'

import { useTranslations } from 'next-intl'
import type { Diner } from '@/lib/store/types'

/** A diner's display label: its custom name, or the localized default ("Diner N"). */
export function useDinerLabel() {
  const t = useTranslations('Diners')
  return (diner: Diner, position?: number) => diner.name ?? t('defaultLabel', { number: position ?? 0 })
}
