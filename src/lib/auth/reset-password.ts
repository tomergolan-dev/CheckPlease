import { grantSignupBonus } from '@/lib/credits/grants'
import { hashPassword } from './password'
import { drizzleUserRepository, isUnverifiedPasswordAccount, verifyRegisteredEmail, type UserRepository } from './register'

export type ResetPasswordResult = { ok: true } | { ok: false; reason: 'no_account' | 'email_taken' }

/**
 * Sets a new password once the emailed code has checked out (the caller checks it first). Works
 * for any account behind that address: a password account, a Google account that never had a
 * password (it can then sign in both ways), or one that never verified, which the code verifies
 * too, since it proves the same mailbox.
 */
export async function resetPassword(
  input: { email: string; password: string },
  repository: UserRepository = drizzleUserRepository,
  grantSignupBonusFn: (userId: string) => Promise<void> = grantSignupBonus
): Promise<ResetPasswordResult> {
  const user = await repository.findByEmail(input.email)
  if (!user) return { ok: false, reason: 'no_account' }

  const unverified = isUnverifiedPasswordAccount(user)
  // An unverified variant of a mailbox that already has an account can't be completed this way either.
  if (unverified && (await repository.mailboxOwnerEmail(input.email))) return { ok: false, reason: 'email_taken' }

  await repository.updatePassword(user.id, await hashPassword(input.password))
  if (unverified) await verifyRegisteredEmail(input.email, repository, grantSignupBonusFn)
  return { ok: true }
}
