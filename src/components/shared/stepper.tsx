'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StepperProps {
  value: number
  min?: number
  onChange: (value: number) => void
  label: string
}

export function Stepper({ value, min = 1, onChange, label }: StepperProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`${label} -`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </Button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`${label} +`}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  )
}
