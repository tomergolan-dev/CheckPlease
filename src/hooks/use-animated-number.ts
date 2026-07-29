'use client'

import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * Smoothly tweens between values instead of jumping — e.g. when a tip percentage
 * changes and every dependent total needs to visibly count up/down rather than snap.
 * No animation on first mount, only on subsequent changes to `target`. Snaps instantly
 * instead of tweening when the user prefers reduced motion.
 */
export function useAnimatedNumber(target: number, durationSeconds = 0.35): number {
  const [display, setDisplay] = useState(target)
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion && display !== target) {
    setDisplay(target)
  }

  useEffect(() => {
    if (prefersReducedMotion) return

    // `display` is intentionally excluded below: it's the animation's start value,
    // captured once when `target` changes — not a dependency that should restart it.
    const controls = animate(display, target, {
      duration: durationSeconds,
      ease: 'easeOut',
      onUpdate: setDisplay,
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationSeconds, prefersReducedMotion])

  return display
}
