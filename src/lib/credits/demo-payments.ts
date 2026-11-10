/**
 * True while Stripe runs in test mode (a `sk_test_` key), so no purchase charges real money.
 * The credit-pack sheet uses it to say so and to show Stripe's published test card. Switching to
 * a live key hides that notice on its own, with no code change.
 */
export function isDemoPayments(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false
}
