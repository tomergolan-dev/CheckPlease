import type { MinorUnits } from './types'

/** ISO 4217 minor-unit exponent per currency. Extend as more currencies are supported. */
const CURRENCY_MINOR_UNIT_EXPONENT: Record<string, number> = {
  ILS: 2,
}

function minorUnitsToMajor(amount: MinorUnits, currency: string): number {
  const exponent = CURRENCY_MINOR_UNIT_EXPONENT[currency] ?? 2
  return amount / 10 ** exponent
}

export function formatCurrency(amount: MinorUnits, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    minorUnitsToMajor(amount, currency)
  )
}
