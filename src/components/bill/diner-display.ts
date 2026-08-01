import type { DinerColorToken } from '@/lib/store/palette'

export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

/**
 * Solid pastel fills, not neutral-tinted backgrounds — a diner's color is their identity
 * everywhere they appear (avatar, chips, summary rows), so it reads the same in both themes
 * rather than dissolving into a dark-mode neutral.
 */
export const DINER_COLOR_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-[#9dc2d9] text-[#2f6a8c]',
  green: 'bg-[#93af7e] text-[#3e5c2c]',
  amber: 'bg-[#f0c25a] text-[#a6740b]',
  rose: 'bg-[#e8a2a0] text-[#b3453f]',
  violet: 'bg-[#b9a8d9] text-[#6a4f9e]',
  teal: 'bg-[#8fc4bb] text-[#2f7d6e]',
  orange: 'bg-[#f0a868] text-[#b3651a]',
  pink: 'bg-[#f4a8c4] text-[#e0568f]',
}

/** The same identity color as a plain solid fill — used for underline bars and other accents
 * that need just the color, not the avatar's background+text pairing. */
export const DINER_DOT_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-[#9dc2d9]',
  green: 'bg-[#93af7e]',
  amber: 'bg-[#f0c25a]',
  rose: 'bg-[#e8a2a0]',
  violet: 'bg-[#b9a8d9]',
  teal: 'bg-[#8fc4bb]',
  orange: 'bg-[#f0a868]',
  pink: 'bg-[#f4a8c4]',
}
