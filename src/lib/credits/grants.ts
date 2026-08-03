import {
  drizzleCreditsRepository,
  type CreditsRepository,
  type GrantPurchaseInput,
  type GrantPurchaseResult,
} from './repository'

export const SIGNUP_BONUS_CREDITS = 10

/**
 * Granted once per user, idempotent on `signup_bonus:{userId}` — safe to call from both signup
 * paths (email/password and Google OAuth, see src/lib/auth/register.ts and
 * src/lib/auth/config.ts's `events.createUser`) without risking a double grant if either is ever
 * invoked more than once for the same user.
 */
export async function grantSignupBonus(
  userId: string,
  repository: CreditsRepository = drizzleCreditsRepository
): Promise<void> {
  await repository.applyLedgerEntry({
    userId,
    type: 'signup_bonus',
    amount: SIGNUP_BONUS_CREDITS,
    idempotencyKey: `signup_bonus:${userId}`,
  })
}

/**
 * The one internal function any payment rail's webhook calls into (see Post-MVP Architecture in
 * CLAUDE.md) — a future native IAP rail is a new caller of this same function, not a rework.
 * Idempotent on `providerRef` (e.g. a Stripe Checkout Session id), so webhook redelivery can
 * never double-grant.
 */
export async function grantPurchase(
  input: GrantPurchaseInput,
  repository: CreditsRepository = drizzleCreditsRepository
): Promise<GrantPurchaseResult> {
  return repository.recordPurchaseAndCredit(input)
}
