import type { DinerColorToken } from '@/lib/store/palette'

export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

/** Soft, tinted backgrounds rather than solid saturated fills — calm, not busy. */
export const DINER_COLOR_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/15 text-green-600 dark:text-green-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  teal: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  pink: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
}
