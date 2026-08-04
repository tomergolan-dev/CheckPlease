export type PackType = 'pack_10' | 'pack_25' | 'pack_60'

export interface CreditPack {
  type: PackType
  credits: number
  /** Agorot — ILS's 2-decimal shape matches Stripe's own `unit_amount` minor-unit convention
   * 1:1, so no conversion logic is needed anywhere this is used. */
  priceMinorUnits: number
  currency: 'ILS'
  /** 'popular' gets the highlighted-border treatment (there's only ever one); 'value' is a
   * quieter badge with no border highlight, so the two never visually compete. */
  badge?: 'popular' | 'value'
}

/**
 * The one place credit pack pricing lives — every route, webhook, and UI surface reads from
 * this array only, never a hardcoded number, so pricing can change without touching payment or
 * credit logic.
 */
export const CREDIT_PACKS: readonly CreditPack[] = [
  { type: 'pack_10', credits: 10, priceMinorUnits: 790, currency: 'ILS' },
  { type: 'pack_25', credits: 25, priceMinorUnits: 1690, currency: 'ILS', badge: 'popular' },
  { type: 'pack_60', credits: 60, priceMinorUnits: 3490, currency: 'ILS', badge: 'value' },
]

export function findCreditPack(type: string): CreditPack | undefined {
  return CREDIT_PACKS.find((pack) => pack.type === type)
}
