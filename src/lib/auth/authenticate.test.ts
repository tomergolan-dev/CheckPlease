import { describe, expect, it, vi } from 'vitest'
import { authenticateWithPassword, type CredentialsRepository } from './authenticate'
import { hashPassword } from './password'

function fakeRepository(row: Awaited<ReturnType<CredentialsRepository['findByEmail']>>): CredentialsRepository {
  return { findByEmail: vi.fn().mockResolvedValue(row) }
}

describe('authenticateWithPassword', () => {
  it('returns the user on a correct password', async () => {
    const passwordHash = await hashPassword('correct horse battery')
    const repository = fakeRepository({ id: 'user-1', email: 'diner@example.com', passwordHash })

    const result = await authenticateWithPassword('Diner@Example.com', 'correct horse battery', repository)
    expect(result).toEqual({ id: 'user-1', email: 'diner@example.com' })
  })

  it('normalizes email casing before lookup', async () => {
    const repository = fakeRepository(undefined)
    await authenticateWithPassword('Diner@Example.com', 'anything', repository)
    expect(repository.findByEmail).toHaveBeenCalledWith('diner@example.com')
  })

  it('returns null for an unknown email', async () => {
    const repository = fakeRepository(undefined)
    expect(await authenticateWithPassword('nobody@example.com', 'anything', repository)).toBeNull()
  })

  it('returns null for a Google-only account with no password set', async () => {
    const repository = fakeRepository({ id: 'user-1', email: 'diner@example.com', passwordHash: null })
    expect(await authenticateWithPassword('diner@example.com', 'anything', repository)).toBeNull()
  })

  it('returns null for a wrong password', async () => {
    const passwordHash = await hashPassword('correct horse battery')
    const repository = fakeRepository({ id: 'user-1', email: 'diner@example.com', passwordHash })
    expect(await authenticateWithPassword('diner@example.com', 'wrong password', repository)).toBeNull()
  })
})
