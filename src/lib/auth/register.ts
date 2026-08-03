import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { grantSignupBonus } from '@/lib/credits/grants'
import { hashPassword } from './password'
import type { RegisterInput } from './validation'

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Email is already registered')
    this.name = 'EmailAlreadyRegisteredError'
  }
}

export interface RegisteredUser {
  id: string
  email: string
}

export interface UserRepository {
  findByEmail(email: string): Promise<{ id: string } | undefined>
  insert(data: { email: string; passwordHash: string }): Promise<RegisteredUser>
}

/** Postgres's unique_violation code — the database's own constraint on `users.email` is the
 * real source of truth for duplicate emails; this lets the race where two requests for the same
 * email both pass the pre-check before either insert completes still surface as the same clean
 * error, not a raw SQL failure. */
const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === UNIQUE_VIOLATION
}

/** The real repository, backed by the actual database. `registerUser` takes a repository as a
 * parameter rather than importing `db` directly, specifically so it can be unit-tested against
 * an in-memory fake without a live Postgres connection. */
export const drizzleUserRepository: UserRepository = {
  async findByEmail(email) {
    const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    return row
  },
  async insert({ email, passwordHash }) {
    const [row] = await db
      .insert(users)
      .values({ email, passwordHash })
      .returning({ id: users.id, email: users.email })
    // Non-null: we just inserted this row with a definite email value.
    return { id: row!.id, email: row!.email! }
  },
}

/**
 * Registers a new email/password account. `input` is expected to already be validated and
 * normalized via `registerInputSchema` (see validation.ts) before reaching here. Returns only
 * the safe fields (id, email) — the password hash is never returned to a caller.
 */
export async function registerUser(
  input: RegisterInput,
  repository: UserRepository = drizzleUserRepository,
  grantSignupBonusFn: (userId: string) => Promise<void> = grantSignupBonus
): Promise<RegisteredUser> {
  const existing = await repository.findByEmail(input.email)
  if (existing) {
    throw new EmailAlreadyRegisteredError()
  }

  const passwordHash = await hashPassword(input.password)

  let user: RegisteredUser
  try {
    user = await repository.insert({ email: input.email, passwordHash })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new EmailAlreadyRegisteredError()
    }
    throw error
  }

  // Google OAuth signup grants the same bonus via events.createUser in src/lib/auth/config.ts —
  // this path bypasses @auth/drizzle-adapter entirely (the insert above is a direct call), so
  // that adapter-only hook never fires here. Never fails registration over a credits hiccup: the
  // grant is idempotent (see grantSignupBonus), so it's safe to retry/backfill later.
  try {
    await grantSignupBonusFn(user.id)
  } catch (error) {
    console.error('registerUser: failed to grant signup bonus', error)
  }

  return user
}
