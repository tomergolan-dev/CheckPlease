/**
 * Semantic color tokens, not raw hex — the UI layer maps a token to an actual color per
 * theme (light/dark), so stored diner data never needs to change when the palette does.
 */
export const DINER_COLOR_TOKENS = [
  'blue',
  'green',
  'amber',
  'rose',
  'violet',
  'teal',
  'orange',
  'pink',
] as const

export type DinerColorToken = (typeof DINER_COLOR_TOKENS)[number]

export function colorTokenForIndex(index: number): DinerColorToken {
  return DINER_COLOR_TOKENS[index % DINER_COLOR_TOKENS.length]!
}
