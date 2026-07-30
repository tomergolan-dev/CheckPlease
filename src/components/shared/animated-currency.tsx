'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
  const shouldReduceMotion = useReducedMotion()
  const isMounted = useRef(false)
  const [pulseKey, setPulseKey] = useState(0)

  // A quick scale pulse on every real change (not the first mount) — a small "cha-ching" moment
  // that fires alongside the existing number tween, keyed so the initial/animate pair replays.
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    setPulseKey((key) => key + 1)
  }, [amount])

  return (
    <motion.span
      key={pulseKey}
      initial={shouldReduceMotion ? false : { scale: 1 }}
      animate={shouldReduceMotion ? undefined : { scale: [1, 1.06, 1] }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className={cn('inline-block tabular-nums', className)}
    >
      {formatCurrency(Math.round(animated), currency)}
    </motion.span>
  )
}
