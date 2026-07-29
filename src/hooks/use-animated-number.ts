'use client'

import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/**
 * Smoothly tweens between values instead of jumping — e.g. when a tip percentage
 * changes and every dependent total needs to visibly count up/down rather than snap.
 * No animation on first mount, only on subsequent changes to `target`.
 */
export function useAnimatedNumber(target: number, durationSeconds = 0.35): number {
  const [display, setDisplay] = useState(target)
  const previous = useRef(target)

  useEffect(() => {
    const controls = animate(previous.current, target, {
      duration: durationSeconds,
      ease: 'easeOut',
      onUpdate: setDisplay,
    })
    previous.current = target
    return () => controls.stop()
  }, [target, durationSeconds])

  return display
}
