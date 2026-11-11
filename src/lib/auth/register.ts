import { and, eq, isNotNull, isNull, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { grantSignupBonus } from '@/lib/credits/grants'
import { canonicalMailbox, canonicalMailboxSql } from './mailbox'
import { hashPassword } from './password'
import type { RegisterInput } from './validation'

export class EmailAlreadyRegisteredError extends Error {
  /**
   * The address that account signs in with: the typed one, or the first-registered variant of the
   * same mailbox. Mailed only to that mailbox's owner, never returned to whoever is signing up.
   */
  readonly signInEmail: string

  constructor(signInEmail: string) {
    super('Email is already registered')
    this.name = 'EmailAlreadyRegisteredError'
    this.signInEmail = signInEmail
  }
}

export interface RegisteredUser {
  id: string
  email: string
}

export interface ExistingUser {
  id: string
  passwordHash: string | null
  emailVerified: Date | null
}

export interface UserRepository {
  findByEmail(email: string): Promise<ExistingUser | undefined>
  insert(data: { email: string; passwordHash: string }): Promise<RegisteredUser>
  updatePassword(id: string, passwordHash: string): Promise<void>
  /** Marks an unverified password account verified; returns its id, or undefined if none. */
  markVerified(email: string): Promise<string | undefined>
  /** Deletes a password account that never verified, freeing its email for its real owner. */
  deleteUnverified(email: string): Promise<void>
  /**
   * The address of another account (verified or Google) that already uses the same real mailbox,
   * e.g. `name@gmail.com` for `name+x@gmail.com`, or undefined if none. Unverified accounts don't
   * count, for the same reason they never "take" an email.
   */
  mailboxOwnerEmail(email: string): Promise<string | undefined>
}

/** A password account that hasn't proven it owns its email yet. Google accounts never are. */
export function isUnverifiedPasswordAccount(user: ExistingUser): boolean {
  return user.passwordHash !== null && user.emailVerified === null
}

/** Postgres's unique_violation code — the database's own constraint on `users.email` is the
 * real source of truth for duplicate emails; this lets the race where two requests for the same
 * email both pass the pre-check before either insert completes still surface as the same clean
 * error, not a raw SQL failure. */
const UNIQUE_VIOLATION = '23505'

/** Drizzle wraps the real driver error in a `DrizzleQueryError`, with the actual Postgres error
 * (the one carrying `.code`) nested under `.cause` — a bare `error.code` check never matches a
 * real database violation, only a hand-constructed test double, so this walks the `.cause` chain. */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('code' in error && error.code === UNIQUE_VIOLATION) return true
  if ('cause' in error) return isUniqueViolation(error.cause)
  return false
}

/** The real repository, backed by the actual database. Injected so the rules can be unit-tested
 * against an in-memory fake without a live Postgres connection. */
export const drizzleUserRepository: UserRepository = {
  async findByEmail(email) {
    const [row] = await db
      .select({ id: users.id, passwordHash: users.passwordHash, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return row
  },
  async insert({ email, passwordHash }) {
    const [row] = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id, email: users.email })
    // Non-null: we just inserted this row with a definite email value.
    return { id: row!.id, email: row!.email! }
  },
  async updatePassword(id, passwordHash) {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id))
  },
  async markVerified(email) {
    const [row] = await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(and(eq(users.email, email), isNotNull(users.passwordHash), isNull(users.emailVerified)))
      .returning({ id: users.id })
    return row?.id
  },
  async deleteUnverified(email) {
    await db.delete(users).where(and(eq(users.email, email), isNotNull(users.passwordHash), isNull(users.emailVerified)))
  },
  async mailboxOwnerEmail(email) {
    const [row] = await db
      .select({ email: users.email })
      .from(users)
      .where(
        and(
          ne(users.email, email),
          eq(canonicalMailboxSql, canonicalMailbox(email)),
          or(isNull(users.passwordHash), isNotNull(users.emailVerified))
        )
      )
      .limit(1)
    return row?.email ?? undefined
  },
}

/**
 * Registers a new email/password account, unverified: it can't sign in or receive the signup
 * bonus until `verifyRegisteredEmail` confirms the emailed code. `input` is expected to already be
 * validated and normalized via `registerInputSchema`.
 *
 * An email held by an account that never verified is not "taken": registering again replaces that
 * account's password, so someone who typed another person's address can't lock its owner out.
 * Only the code sent to the address decides who keeps it.
 *
 * One real mailbox, one account: `name+x@gmail.com` is refused once `name@gmail.com` has an
 * account, so the free scans can't be collected again with an address variant.
 */
export async function registerUser(input: RegisterInput, repository: UserRepository = drizzleUserRepository): Promise<RegisteredUser> {
  const passwordHash = await hashPassword(input.password)
  const existing = await repository.findByEmail(input.email)

  if (existing) {
    if (!isUnverifiedPasswordAccount(existing)) throw new EmailAlreadyRegisteredError(input.email)
    const owner = await repository.mailboxOwnerEmail(input.email)
    if (owner) throw new EmailAlreadyRegisteredError(owner)
    await repository.updatePassword(existing.id, passwordHash)
    return { id: existing.id, email: input.email }
  }
  const owner = await repository.mailboxOwnerEmail(input.email)
  if (owner) throw new EmailAlreadyRegisteredError(owner)

  try {
    return await repository.insert({ email: input.email, passwordHash })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new EmailAlreadyRegisteredError(input.email)
    }
    throw error
  }
}

/**
 * Completes registration once the emailed code checked out: the account becomes verified and gets
 * its free scans (Google signups get theirs from events.createUser in config.ts). Never fails over
 * a credits hiccup, since the grant is idempotent and can be retried.
 */
export async function verifyRegisteredEmail(
  email: string,
  repository: UserRepository = drizzleUserRepository,
  grantSignupBonusFn: (userId: string) => Promise<void> = grantSignupBonus
): Promise<{ ok: true; userId: string } | { ok: false }> {
  // Two variants of one mailbox could both be waiting for their codes; only the first one counts.
  if (await repository.mailboxOwnerEmail(email)) return { ok: false }
  const userId = await repository.markVerified(email)
  if (!userId) return { ok: false }
  try {
    await grantSignupBonusFn(userId)
  } catch (error) {
    console.error('verifyRegisteredEmail: failed to grant signup bonus', error)
  }
  return { ok: true, userId }
}
