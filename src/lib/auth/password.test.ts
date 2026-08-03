import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('hashPassword / verifyPassword', () => {
  it('verifies a password against its own hash', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('wrong password', hash)).toBe(false)
  })

  it('produces a different hash each time (random salt), while both still verify', async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword('same password'),
      hashPassword('same password'),
    ])
    expect(hashA).not.toBe(hashB)
    expect(await verifyPassword('same password', hashA)).toBe(true)
    expect(await verifyPassword('same password', hashB)).toBe(true)
  })

  it('never stores the password itself in the hash', async () => {
    const hash = await hashPassword('super-secret-password')
    expect(hash).not.toContain('super-secret-password')
  })
})
