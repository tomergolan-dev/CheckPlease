'use client'

import { formatCurrency } from '@/lib/money'
import { useAnimatedNumber } from '@/hooks/use-animated-number'

export function AnimatedCurrency({ amount, currency }: { amount: number; currency: string }) {
  const animated = useAnimatedNumber(amount)
  return <span>{formatCurrency(Math.round(animated), currency)}</span>
}
