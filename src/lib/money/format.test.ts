import { describe, expect, it } from 'vitest'
import { formatCurrency, minorUnitsToInputValue, parseInputValueToMinorUnits } from './format'

describe('formatCurrency', () => {
  it('formats ILS using the he-IL locale regardless of interface language', () => {
    expect(formatCurrency(3400, 'ILS')).toContain('34')
    expect(formatCurrency(3400, 'ILS')).toContain('₪')
  })
})

describe('minorUnitsToInputValue', () => {
  it('renders a plain two-decimal string for ILS', () => {
    expect(minorUnitsToInputValue(3333, 'ILS')).toBe('33.33')
    expect(minorUnitsToInputValue(0, 'ILS')).toBe('0.00')
    expect(minorUnitsToInputValue(100, 'ILS')).toBe('1.00')
  })
})

describe('parseInputValueToMinorUnits', () => {
  it('parses a decimal string into integer minor units', () => {
    expect(parseInputValueToMinorUnits('33.33', 'ILS')).toBe(3333)
    expect(parseInputValueToMinorUnits('1', 'ILS')).toBe(100)
    expect(parseInputValueToMinorUnits('0', 'ILS')).toBe(0)
  })

  it('treats invalid input as zero', () => {
    expect(parseInputValueToMinorUnits('', 'ILS')).toBe(0)
    expect(parseInputValueToMinorUnits('abc', 'ILS')).toBe(0)
  })

  it('treats negative input as zero rather than a negative amount', () => {
    expect(parseInputValueToMinorUnits('-5', 'ILS')).toBe(0)
  })

  it('round-trips with minorUnitsToInputValue', () => {
    expect(parseInputValueToMinorUnits(minorUnitsToInputValue(4999, 'ILS'), 'ILS')).toBe(4999)
  })
})
