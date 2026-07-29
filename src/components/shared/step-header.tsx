'use client'

import { ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface StepHeaderProps {
  title: string
  onBack?: () => void
}

export function StepHeader({ title, onBack }: StepHeaderProps) {
  const t = useTranslations('Common')

  return (
    <header className="flex items-center gap-2 px-4 py-4">
      {onBack && (
        <Button variant="ghost" size="icon" aria-label={t('back')} onClick={onBack}>
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
      )}
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
    </header>
  )
}
