'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/money'
import { useAnimatedNumber } from '@/hooks/use-animated-number'

export function AnimatedCurrency({
  amount,
  currency,
  className,
}: {
  amount: number
  currency: string
  className?: string
}) {
  const animated = useAnimatedNumber(amount)
  return <span className={cn('tabular-nums', className)}>{formatCurrency(Math.round(animated), currency)}</span>
}
