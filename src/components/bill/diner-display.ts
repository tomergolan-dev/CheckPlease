import type { DinerColorToken } from '@/lib/store/palette'

export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

/**
 * A soft same-hue gradient, not a flat fill — a diner's color is their identity everywhere
 * they appear (avatar, chips, summary rows), and the gentle depth this gives each avatar is
 * what makes the paying-parties row read as friendly/personal rather than a flat color chip.
 * A modern, more saturated pastel family — clean blue/purple/emerald/orange rather than the
 * grayer, more muted tones this started from.
 */
export const DINER_COLOR_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-gradient-to-br from-[#93c5f5] to-[#4f9ee0] text-[#1e4976]',
  green: 'bg-gradient-to-br from-[#92e0c0] to-[#34c98f] text-[#1f5c3e]',
  amber: 'bg-gradient-to-br from-[#fbd97a] to-[#f0b429] text-[#7c4a03]',
  rose: 'bg-gradient-to-br from-[#f6a8b8] to-[#ea6d8a] text-[#7a1f36]',
  violet: 'bg-gradient-to-br from-[#d3bdf5] to-[#a875e8] text-[#4a2a7a]',
  teal: 'bg-gradient-to-br from-[#92e0d3] to-[#3ec4b0] text-[#134e48]',
  orange: 'bg-gradient-to-br from-[#fbc48c] to-[#f5923c] text-[#7c3d05]',
  pink: 'bg-gradient-to-br from-[#f7b0d0] to-[#ef7ab8] text-[#7a1f52]',
}

/** The same identity color as a plain solid fill — used for underline bars and other accents
 * that need just the color, not the avatar's background+text pairing. */
export const DINER_DOT_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-[#4f9ee0]',
  green: 'bg-[#34c98f]',
  amber: 'bg-[#f0b429]',
  rose: 'bg-[#ea6d8a]',
  violet: 'bg-[#a875e8]',
  teal: 'bg-[#3ec4b0]',
  orange: 'bg-[#f5923c]',
  pink: 'bg-[#ef7ab8]',
}

/** Just the identity text color — for placing a diner's accent on a number/label that sits on
 * a neutral background (e.g. the per-person payment card's final amount), without the avatar's
 * gradient background coming along for the ride. Genuinely vibrant (not the muted avatar tones)
 * since this is the one number on the card the eye is meant to land on. */
export const DINER_TEXT_CLASSES: Record<DinerColorToken, string> = {
  blue: 'text-[#2563eb]',
  green: 'text-[#10b981]',
  amber: 'text-[#d97706]',
  rose: 'text-[#e11d48]',
  violet: 'text-[#7c3aed]',
  teal: 'text-[#0d9488]',
  orange: 'text-[#ea580c]',
  pink: 'text-[#db2777]',
}

/** A solid, vibrant fill using the same hue family as DINER_TEXT_CLASSES — for small
 * high-contrast badges (e.g. the party-size count) that need to read clearly at a glance,
 * always paired with white text. Keeps a diner's color identical across avatar, badge, and
 * payment card instead of the badge defaulting to a one-size-fits-all primary orange. */
export const DINER_VIBRANT_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-[#2563eb]',
  green: 'bg-[#10b981]',
  amber: 'bg-[#d97706]',
  rose: 'bg-[#e11d48]',
  violet: 'bg-[#7c3aed]',
  teal: 'bg-[#0d9488]',
  orange: 'bg-[#ea580c]',
  pink: 'bg-[#db2777]',
}
