import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasUnlimitedCredits } from './dev-override'

describe('hasUnlimitedCredits', () => {
  const originalValue = process.env.UNLIMITED_CREDITS_EMAILS

  beforeEach(() => {
    delete process.env.UNLIMITED_CREDITS_EMAILS
  })

  afterEach(() => {
    if (originalValue === undefined) delete process.env.UNLIMITED_CREDITS_EMAILS
    else process.env.UNLIMITED_CREDITS_EMAILS = originalValue
  })

  it('is disabled (returns false) when the env var is unset', () => {
    expect(hasUnlimitedCredits('tomergolan01@gmail.com')).toBe(false)
  })

  it('returns false for null/undefined email even when the allowlist is set', () => {
    process.env.UNLIMITED_CREDITS_EMAILS = 'tomergolan01@gmail.com'
    expect(hasUnlimitedCredits(null)).toBe(false)
    expect(hasUnlimitedCredits(undefined)).toBe(false)
  })

  it('matches an allowlisted email', () => {
    process.env.UNLIMITED_CREDITS_EMAILS = 'tomergolan01@gmail.com'
    expect(hasUnlimitedCredits('tomergolan01@gmail.com')).toBe(true)
  })

  it('is case-insensitive', () => {
    process.env.UNLIMITED_CREDITS_EMAILS = 'Tomer@Example.com'
    expect(hasUnlimitedCredits('tomer@example.com')).toBe(true)
  })

  it('supports multiple comma-separated emails with surrounding whitespace', () => {
    process.env.UNLIMITED_CREDITS_EMAILS = ' a@example.com , b@example.com,c@example.com '
    expect(hasUnlimitedCredits('b@example.com')).toBe(true)
    expect(hasUnlimitedCredits('c@example.com')).toBe(true)
  })

  it('does not match a non-allowlisted email', () => {
    process.env.UNLIMITED_CREDITS_EMAILS = 'tomergolan01@gmail.com'
    expect(hasUnlimitedCredits('someone-else@example.com')).toBe(false)
  })
})
