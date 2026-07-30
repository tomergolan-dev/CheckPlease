'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * Large, heavily blurred color washes that drift slowly behind the bill canvas — an ambient
 * presence, not a focal point. Positions use logical `insetInlineStart`/`insetInlineEnd` so the
 * layout mirrors correctly between LTR and RTL. Purely decorative: aria-hidden, pointer-events-none.
 */
const BLOBS = [
  { className: 'bg-blue-400/25 dark:bg-blue-500/10', size: 380, top: '-10%', side: 'start' as const, offset: '-15%' },
  { className: 'bg-rose-400/20 dark:bg-rose-500/10', size: 340, top: '38%', side: 'end' as const, offset: '-18%' },
  { className: 'bg-amber-300/20 dark:bg-amber-500/10', size: 320, top: '72%', side: 'start' as const, offset: '-10%' },
]

export function AmbientBackground() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {BLOBS.map((blob, index) => (
        <motion.span
          key={index}
          className={`absolute rounded-full blur-3xl ${blob.className}`}
          style={{
            width: blob.size,
            height: blob.size,
            top: blob.top,
            ...(blob.side === 'start' ? { insetInlineStart: blob.offset } : { insetInlineEnd: blob.offset }),
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : { x: [0, 24, -16, 0], y: [0, -18, 14, 0], scale: [1, 1.08, 0.95, 1] }
          }
          transition={{
            duration: 22 + index * 4,
            delay: index * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
