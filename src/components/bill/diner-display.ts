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
 */
export const DINER_COLOR_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-gradient-to-br from-[#b7d7e8] to-[#86b0cd] text-[#1f4f68]',
  green: 'bg-gradient-to-br from-[#c3d6b2] to-[#9ab982] text-[#33501f]',
  amber: 'bg-gradient-to-br from-[#f5d685] to-[#e0ac3e] text-[#8a5e07]',
  rose: 'bg-gradient-to-br from-[#f0bcb9] to-[#de9490] text-[#8a3128]',
  violet: 'bg-gradient-to-br from-[#cabbe6] to-[#a58fcf] text-[#4c3878]',
  teal: 'bg-gradient-to-br from-[#aed8ce] to-[#7ab8ab] text-[#1f5c50]',
  orange: 'bg-gradient-to-br from-[#f5c093] to-[#e39555] text-[#8a4c10]',
  pink: 'bg-gradient-to-br from-[#f8c4d9] to-[#ea8fb6] text-[#96285e]',
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

/** Just the identity text color — for placing a diner's accent on a number/label that sits on
 * a neutral background (e.g. the per-person payment card's final amount), without the avatar's
 * gradient background coming along for the ride. Genuinely vibrant (not the muted avatar tones)
 * since this is the one number on the card the eye is meant to land on. */
export const DINER_TEXT_CLASSES: Record<DinerColorToken, string> = {
  blue: 'text-[#2563eb]',
  green: 'text-[#16a34a]',
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
  green: 'bg-[#16a34a]',
  amber: 'bg-[#d97706]',
  rose: 'bg-[#e11d48]',
  violet: 'bg-[#7c3aed]',
  teal: 'bg-[#0d9488]',
  orange: 'bg-[#ea580c]',
  pink: 'bg-[#db2777]',
}

/** A very pale wash of a diner's identity color — for a card background that reads as
 * "theirs" without competing with the bold accent-colored amount sitting on top of it.
 * Lighter than it looks like it should be — the color's job here is a whisper of identity,
 * not a block of tint. */
export const DINER_TINT_CLASSES: Record<DinerColorToken, string> = {
  blue: 'bg-[#b7d7e8]/[0.14]',
  green: 'bg-[#c3d6b2]/[0.14]',
  amber: 'bg-[#f5d685]/[0.14]',
  rose: 'bg-[#f0bcb9]/[0.14]',
  violet: 'bg-[#cabbe6]/[0.14]',
  teal: 'bg-[#aed8ce]/[0.14]',
  orange: 'bg-[#f5c093]/[0.14]',
  pink: 'bg-[#f8c4d9]/[0.14]',
}

/** A slightly stronger wash of the same color, for a hairline border that gives the pale
 * tint card definition without a heavy neutral-gray outline. */
export const DINER_BORDER_CLASSES: Record<DinerColorToken, string> = {
  blue: 'border-[#b7d7e8]/40',
  green: 'border-[#c3d6b2]/40',
  amber: 'border-[#f5d685]/40',
  rose: 'border-[#f0bcb9]/40',
  violet: 'border-[#cabbe6]/40',
  teal: 'border-[#aed8ce]/40',
  orange: 'border-[#f5c093]/40',
  pink: 'border-[#f8c4d9]/40',
}
