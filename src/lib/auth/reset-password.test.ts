import { describe, expect, it, vi } from 'vitest'
import { verifyPassword } from './password'
import type { ExistingUser, UserRepository } from './register'
import { resetPassword } from './reset-password'

function fakeRepository(user: ExistingUser | undefined, overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(user),
    insert: vi.fn(),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    markVerified: vi.fn().mockResolvedValue(user?.id),
    deleteUnverified: vi.fn(),
    mailboxOwnerEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const INPUT = { email: 'diner@example.com', password: 'a brand new password' }

describe('resetPassword', () => {
  it('replaces the password of a password account', async () => {
    const repository = fakeRepository({ id: 'u1', passwordHash: 'old', emailVerified: new Date() })
    const grant = vi.fn()

    expect(await resetPassword(INPUT, repository, grant)).toEqual({ ok: true })
    const [id, hash] = vi.mocked(repository.updatePassword).mock.calls[0]!
    expect(id).toBe('u1')
    expect(await verifyPassword(INPUT.password, hash)).toBe(true)
    expect(grant).not.toHaveBeenCalled()
  })

  it('gives a Google account a password, without granting the free scans again', async () => {
    const repository = fakeRepository({ id: 'g1', passwordHash: null, emailVerified: new Date() })
    const grant = vi.fn()

    expect(await resetPassword(INPUT, repository, grant)).toEqual({ ok: true })
    expect(repository.updatePassword).toHaveBeenCalledOnce()
    expect(repository.markVerified).not.toHaveBeenCalled()
    expect(grant).not.toHaveBeenCalled()
  })

  it('also verifies an account that never verified, and grants its free scans', async () => {
    const repository = fakeRepository({ id: 'n1', passwordHash: 'old', emailVerified: null })
    const grant = vi.fn().mockResolvedValue(undefined)

    expect(await resetPassword(INPUT, repository, grant)).toEqual({ ok: true })
    expect(repository.markVerified).toHaveBeenCalledWith(INPUT.email)
    expect(grant).toHaveBeenCalledWith('n1')
  })

  it("won't complete an unverified variant of a mailbox that already has an account", async () => {
    const repository = fakeRepository(
      { id: 'n1', passwordHash: 'old', emailVerified: null },
      { mailboxOwnerEmail: vi.fn().mockResolvedValue('diner@example.org') }
    )

    expect(await resetPassword(INPUT, repository, vi.fn())).toEqual({ ok: false, reason: 'email_taken' })
    expect(repository.updatePassword).not.toHaveBeenCalled()
  })

  it('reports an address with no account', async () => {
    expect(await resetPassword(INPUT, fakeRepository(undefined), vi.fn())).toEqual({ ok: false, reason: 'no_account' })
  })
})
