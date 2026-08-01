'use client'

import { Check } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { BRAND_NAME } from '@/lib/brand'
import { DINER_COLOR_CLASSES } from './diner-display'

const FLOATING_DOTS = [
  { color: 'blue', className: 'start-2 top-0 size-9', delay: 0 },
  { color: 'amber', className: 'end-2 top-16 size-7', delay: 0.35 },
  { color: 'rose', className: 'start-0 bottom-8 size-8', delay: 0.7 },
  { color: 'teal', className: 'end-6 bottom-0 size-6', delay: 1.05 },
] as const satisfies { color: keyof typeof DINER_COLOR_CLASSES; className: string; delay: number }[]

export function OnboardingScreen({ onStart }: { onStart: () => void }) {
  const t = useTranslations('App')
  const tHome = useTranslations('Home')
  const shouldReduceMotion = useReducedMotion()

  const fadeUp = (delay: number) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: 'easeOut' as const },
        }

  return (
    <div className="safe-top safe-bottom safe-x flex min-h-dvh flex-col items-center justify-center gap-10 px-7 text-center">
      <div className="relative flex h-52 w-full max-w-60 items-center justify-center">
        {FLOATING_DOTS.map((dot) => (
          <motion.span
            key={dot.color}
            aria-hidden="true"
            className={`absolute rounded-full shadow-soft ${DINER_COLOR_CLASSES[dot.color]} ${dot.className}`}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.6 }}
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: [0, -8, 0] }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    opacity: { duration: 0.4, delay: dot.delay },
                    scale: { duration: 0.4, delay: dot.delay },
                    y: {
                      duration: 3,
                      delay: dot.delay + 0.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }
            }
          />
        ))}

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: -3 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
          className="relative flex w-40 flex-col gap-2.5 rounded-3xl border border-border bg-card px-5 py-6 shadow-elevated"
        >
          <span className="h-2 w-3/4 rounded-full bg-muted" />
          <span className="h-2 w-1/2 rounded-full bg-muted" />
          <span className="h-2 w-2/3 rounded-full bg-muted" />
          <span className="my-1 border-t border-dashed border-border" />
          <div className="flex items-center justify-between">
            <span className="h-2.5 w-10 rounded-full bg-foreground/70" />
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3.5" />
            </span>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.h1 {...fadeUp(0.3)} className="text-4xl font-semibold tracking-tight">
          {BRAND_NAME}
        </motion.h1>
        <motion.p {...fadeUp(0.4)} className="text-base whitespace-pre-line text-muted-foreground">
          {t('tagline')}
        </motion.p>
      </div>

      <motion.div {...fadeUp(0.55)} className="w-full max-w-xs">
        <Button size="lg" className="w-full" onClick={onStart}>
          {tHome('startBillCta')}
        </Button>
      </motion.div>
    </div>
  )
}
