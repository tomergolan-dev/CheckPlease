import { describe, expect, it, vi } from 'vitest'
import { EmailAlreadyRegisteredError, registerUser, type UserRepository } from './register'
import { verifyPassword } from './password'

function fakeRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockImplementation(async ({ email }) => ({ id: 'user-1', email })),
    ...overrides,
  }
}

// Every call below passes this explicitly, rather than relying on the real `grantSignupBonus`
// default — that default talks to the real database, which these unit tests must never do.
function fakeGrantSignupBonus() {
  return vi.fn().mockResolvedValue(undefined)
}

describe('registerUser', () => {
  it('registers a new user and returns only safe fields', async () => {
    const repository = fakeRepository()
    const result = await registerUser(
      { email: 'diner@example.com', password: 'correct horse battery' },
      repository,
      fakeGrantSignupBonus()
    )

    expect(result).toEqual({ id: 'user-1', email: 'diner@example.com' })
    expect(repository.findByEmail).toHaveBeenCalledWith('diner@example.com')
  })

  it('hashes the password before it reaches the repository — the plain password is never inserted', async () => {
    const repository = fakeRepository()
    await registerUser(
      { email: 'diner@example.com', password: 'correct horse battery' },
      repository,
      fakeGrantSignupBonus()
    )

    const insertedArg = vi.mocked(repository.insert).mock.calls[0]![0]
    expect(insertedArg.passwordHash).not.toBe('correct horse battery')
    expect(await verifyPassword('correct horse battery', insertedArg.passwordHash)).toBe(true)
  })

  it('rejects registration when the email pre-check finds an existing user', async () => {
    const repository = fakeRepository({ findByEmail: vi.fn().mockResolvedValue({ id: 'existing-user' }) })

    await expect(
      registerUser(
        { email: 'diner@example.com', password: 'correct horse battery' },
        repository,
        fakeGrantSignupBonus()
      )
    ).rejects.toThrow(EmailAlreadyRegisteredError)
    expect(repository.insert).not.toHaveBeenCalled()
  })

  it('translates a database unique-constraint violation into the same clean error', async () => {
    const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' })
    const repository = fakeRepository({ insert: vi.fn().mockRejectedValue(uniqueViolation) })

    await expect(
      registerUser(
        { email: 'diner@example.com', password: 'correct horse battery' },
        repository,
        fakeGrantSignupBonus()
      )
    ).rejects.toThrow(EmailAlreadyRegisteredError)
  })

  it('lets an unrelated database error propagate rather than masking it as a duplicate email', async () => {
    const repository = fakeRepository({ insert: vi.fn().mockRejectedValue(new Error('connection reset')) })

    await expect(
      registerUser(
        { email: 'diner@example.com', password: 'correct horse battery' },
        repository,
        fakeGrantSignupBonus()
      )
    ).rejects.toThrow('connection reset')
  })

  it('grants the signup bonus for the newly created user', async () => {
    const repository = fakeRepository()
    const grantSignupBonusFn = fakeGrantSignupBonus()

    await registerUser({ email: 'diner@example.com', password: 'correct horse battery' }, repository, grantSignupBonusFn)

    expect(grantSignupBonusFn).toHaveBeenCalledWith('user-1')
  })

  it('does not fail registration if granting the signup bonus fails', async () => {
    const repository = fakeRepository()
    const grantSignupBonusFn = vi.fn().mockRejectedValue(new Error('credits db unavailable'))

    const result = await registerUser(
      { email: 'diner@example.com', password: 'correct horse battery' },
      repository,
      grantSignupBonusFn
    )

    expect(result).toEqual({ id: 'user-1', email: 'diner@example.com' })
  })
})
