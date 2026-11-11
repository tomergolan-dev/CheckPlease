import { describe, expect, it, vi } from 'vitest'
import { EmailAlreadyRegisteredError, registerUser, verifyRegisteredEmail, type ExistingUser, type UserRepository } from './register'
import { verifyPassword } from './password'

function fakeRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockImplementation(async ({ email }) => ({ id: 'user-1', email })),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    markVerified: vi.fn().mockResolvedValue('user-1'),
    deleteUnverified: vi.fn().mockResolvedValue(undefined),
    mailboxOwnerEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const INPUT = { email: 'diner@example.com', password: 'correct horse battery' }
const verifiedPasswordUser: ExistingUser = { id: 'existing', passwordHash: 'hash', emailVerified: new Date() }
const googleUser: ExistingUser = { id: 'existing', passwordHash: null, emailVerified: null }
const unverifiedUser: ExistingUser = { id: 'squatter', passwordHash: 'old-hash', emailVerified: null }

describe('registerUser', () => {
  it('registers a new user and returns only safe fields', async () => {
    const repository = fakeRepository()
    const result = await registerUser(INPUT, repository)

    expect(result).toEqual({ id: 'user-1', email: 'diner@example.com' })
    expect(repository.findByEmail).toHaveBeenCalledWith('diner@example.com')
  })

  it('hashes the password before it reaches the repository — the plain password is never inserted', async () => {
    const repository = fakeRepository()
    await registerUser(INPUT, repository)

    const insertedArg = vi.mocked(repository.insert).mock.calls[0]![0]
    expect(insertedArg.passwordHash).not.toBe(INPUT.password)
    expect(await verifyPassword(INPUT.password, insertedArg.passwordHash)).toBe(true)
  })

  it('rejects an email that a verified password account already uses', async () => {
    const repository = fakeRepository({ findByEmail: vi.fn().mockResolvedValue(verifiedPasswordUser) })

    await expect(registerUser(INPUT, repository)).rejects.toThrow(EmailAlreadyRegisteredError)
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('rejects an email that a Google account already uses', async () => {
    const repository = fakeRepository({ findByEmail: vi.fn().mockResolvedValue(googleUser) })

    await expect(registerUser(INPUT, repository)).rejects.toThrow(EmailAlreadyRegisteredError)
  })

  it("takes over an account that never verified, so a typo or squatter can't lock the owner out", async () => {
    const repository = fakeRepository({ findByEmail: vi.fn().mockResolvedValue(unverifiedUser) })

    const result = await registerUser(INPUT, repository)

    expect(result).toEqual({ id: 'squatter', email: 'diner@example.com' })
    expect(repository.insert).not.toHaveBeenCalled()
    const [, newHash] = vi.mocked(repository.updatePassword).mock.calls[0]!
    expect(await verifyPassword(INPUT.password, newHash)).toBe(true)
  })

  it('rejects an address variant of a mailbox that already has an account', async () => {
    const repository = fakeRepository({ mailboxOwnerEmail: vi.fn().mockResolvedValue('diner@example.org') })

    // The notice tells the mailbox's owner which address their account actually signs in with.
    await expect(registerUser(INPUT, repository)).rejects.toMatchObject({ signInEmail: 'diner@example.org' })
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('does not let an unverified variant take over a mailbox that already has an account', async () => {
    const repository = fakeRepository({
      findByEmail: vi.fn().mockResolvedValue(unverifiedUser),
      mailboxOwnerEmail: vi.fn().mockResolvedValue('diner@example.org'),
    })

    await expect(registerUser(INPUT, repository)).rejects.toThrow(EmailAlreadyRegisteredError)
    expect(repository.updatePassword).not.toHaveBeenCalled()
  })

  it('translates a database unique-constraint violation into the same clean error', async () => {
    const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' })
    const repository = fakeRepository({ insert: vi.fn().mockRejectedValue(uniqueViolation) })

    await expect(registerUser(INPUT, repository)).rejects.toThrow(EmailAlreadyRegisteredError)
  })

  it('lets an unrelated database error propagate rather than masking it as a duplicate email', async () => {
    const repository = fakeRepository({ insert: vi.fn().mockRejectedValue(new Error('connection reset')) })

    await expect(registerUser(INPUT, repository)).rejects.toThrow('connection reset')
  })
})

describe('verifyRegisteredEmail', () => {
  it('verifies the account and only then grants the free scans', async () => {
    const repository = fakeRepository()
    const grant = vi.fn().mockResolvedValue(undefined)

    expect(await verifyRegisteredEmail('diner@example.com', repository, grant)).toEqual({ ok: true, userId: 'user-1' })
    expect(grant).toHaveBeenCalledWith('user-1')
  })

  it('grants nothing when there is no unverified account to verify', async () => {
    const repository = fakeRepository({ markVerified: vi.fn().mockResolvedValue(undefined) })
    const grant = vi.fn()

    expect(await verifyRegisteredEmail('diner@example.com', repository, grant)).toEqual({ ok: false })
    expect(grant).not.toHaveBeenCalled()
  })

  it('refuses to verify a second account for a mailbox that was verified meanwhile', async () => {
    const repository = fakeRepository({ mailboxOwnerEmail: vi.fn().mockResolvedValue('diner@example.org') })
    const grant = vi.fn()

    expect(await verifyRegisteredEmail('diner@example.com', repository, grant)).toEqual({ ok: false })
    expect(repository.markVerified).not.toHaveBeenCalled()
    expect(grant).not.toHaveBeenCalled()
  })

  it('still verifies if granting the free scans fails', async () => {
    const repository = fakeRepository()
    const grant = vi.fn().mockRejectedValue(new Error('credits db unavailable'))

    expect(await verifyRegisteredEmail('diner@example.com', repository, grant)).toEqual({ ok: true, userId: 'user-1' })
  })
})
