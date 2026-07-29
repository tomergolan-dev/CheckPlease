import type { MinorUnits } from './types'

/** ISO 4217 minor-unit exponent per currency. Extend as more currencies are supported. */
const CURRENCY_MINOR_UNIT_EXPONENT: Record<string, number> = {
  ILS: 2,
}

/**
 * The canonical Intl locale used to format each currency — independent of the
 * interface language, so ILS always formats the same way whether the UI is shown
 * in Hebrew or English.
 */
const CURRENCY_LOCALE: Record<string, string> = {
  ILS: 'he-IL',
}

export function getCurrencyMinorUnitExponent(currency: string): number {
  return CURRENCY_MINOR_UNIT_EXPONENT[currency] ?? 2
}

function getCurrencyLocale(currency: string): string {
  return CURRENCY_LOCALE[currency] ?? 'en-US'
}

function minorUnitsToMajor(amount: MinorUnits, currency: string): number {
  return amount / 10 ** getCurrencyMinorUnitExponent(currency)
}

export function formatCurrency(amount: MinorUnits, currency: string): string {
  return new Intl.NumberFormat(getCurrencyLocale(currency), { style: 'currency', currency }).format(
    minorUnitsToMajor(amount, currency)
  )
}

/** A plain decimal string (no symbol/grouping) suitable for a controlled price input's value. */
export function minorUnitsToInputValue(amount: MinorUnits, currency: string): string {
  return minorUnitsToMajor(amount, currency).toFixed(getCurrencyMinorUnitExponent(currency))
}

/** Parses a user-typed decimal amount into integer minor units. Invalid or negative input parses to 0. */
export function parseInputValueToMinorUnits(value: string, currency: string): MinorUnits {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed * 10 ** getCurrencyMinorUnitExponent(currency))
}
