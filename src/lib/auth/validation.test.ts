import { describe, expect, it } from 'vitest'
import { normalizeEmail, registerInputSchema } from './validation'

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeEmail('  Diner@Example.com  ')).toBe('diner@example.com')
  })
})

describe('registerInputSchema', () => {
  it('accepts a valid email/password and normalizes the email', () => {
    const result = registerInputSchema.safeParse({ email: '  Diner@Example.com  ', password: 'correct horse' })
    expect(result.success).toBe(true)
    expect(result.data?.email).toBe('diner@example.com')
  })

  it('rejects a malformed email', () => {
    expect(registerInputSchema.safeParse({ email: 'not-an-email', password: 'correct horse' }).success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(registerInputSchema.safeParse({ email: 'diner@example.com', password: 'short' }).success).toBe(false)
  })

  it('accepts an 8-character password at the boundary', () => {
    expect(registerInputSchema.safeParse({ email: 'diner@example.com', password: '12345678' }).success).toBe(true)
  })
})
