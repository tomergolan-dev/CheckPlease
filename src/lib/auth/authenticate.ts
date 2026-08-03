import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { verifyPassword } from './password'
import { normalizeEmail } from './validation'

export interface AuthenticatedUser {
  id: string
  email: string
}

interface CredentialsRow {
  id: string
  email: string | null
  passwordHash: string | null
}

export interface CredentialsRepository {
  findByEmail(email: string): Promise<CredentialsRow | undefined>
}

export const drizzleCredentialsRepository: CredentialsRepository = {
  async findByEmail(email) {
    const [row] = await db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return row
  },
}

/**
 * Verifies an email/password pair against the stored hash for the Credentials provider's
 * authorize() callback (see config.ts). Returns the safe user fields on success, or `null` for
 * every failure case — unknown email, a Google-only account with no password set, or a wrong
 * password — deliberately the same generic outcome for all three, so a failed attempt can't be
 * used to enumerate which emails are registered or how they authenticate.
 */
export async function authenticateWithPassword(
  email: string,
  password: string,
  repository: CredentialsRepository = drizzleCredentialsRepository
): Promise<AuthenticatedUser | null> {
  const user = await repository.findByEmail(normalizeEmail(email))
  if (!user?.passwordHash || !user.email) return null

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null

  return { id: user.id, email: user.email }
}
