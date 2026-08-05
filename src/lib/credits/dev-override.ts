/**
 * DEV/DEMO-ONLY override — not part of the real credit system. An optional allowlist of emails
 * that get unlimited scan credits, so a portfolio/demo account never needs a real purchase to
 * exercise the scanning flow.
 *
 * Deliberately isolated at the API-route level (see src/app/api/scan-receipt/route.ts), not
 * inside src/lib/credits/reserve.ts or the ledger repository: an allowlisted user's scans skip
 * reserveCredit/refundCredit entirely, so this can never create a ledger row, touch
 * credit_balances, or interact with real credit accounting in any way. Every other user goes
 * through the exact same reserve → finalize/refund lifecycle as before, untouched.
 *
 * Disabled unless UNLIMITED_CREDITS_EMAILS is set (comma-separated emails) — leave it unset in
 * any environment meant to charge real users, and never commit a real value to
 * .env.local.example. To remove entirely before a commercial launch: delete this file and its
 * one call site (grep the codebase for `hasUnlimitedCredits`).
 */
export function hasUnlimitedCredits(email: string | null | undefined): boolean {
  if (!email) return false
  const allowlist = process.env.UNLIMITED_CREDITS_EMAILS
  if (!allowlist) return false
  return allowlist
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase())
}
