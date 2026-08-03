import { pgTable, primaryKey, text, timestamp, integer, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * Matches @auth/drizzle-adapter's expected default Postgres shape exactly (table/column names,
 * types, nullability) so the adapter works with zero per-field mapping — see
 * node_modules/@auth/drizzle-adapter/lib/pg.js for the reference shape this mirrors. The one
 * addition is `passwordHash`, for the Credentials (email/password) provider — the adapter itself
 * has no concept of passwords, so this lives directly on `users` rather than a separate table:
 * it's a 1:1 optional attribute (null for Google-only accounts), not a distinct entity.
 *
 * `sessionsTable` and `verificationTokensTable` (both optional in the adapter) are deliberately
 * omitted — the app uses the JWT session strategy (see Post-MVP Architecture in CLAUDE.md), so a
 * database sessions table is never read; verification tokens are only for magic-link/passwordless
 * email, which this app isn't using. Both are trivial to add later if that changes.
 */
export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  /** Null for accounts that have only ever signed in via an OAuth provider (Google). Never
   * selected into any API response — see src/lib/auth/register.ts and the Credentials
   * provider's authorize() callback, the only two places this column is read. */
  passwordHash: text('password_hash'),
})

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
)

/**
 * Credit system tables (see Post-MVP Architecture: SaaS Foundation in CLAUDE.md). Unlike `users`/
 * `accounts` above, these aren't dictated by @auth/drizzle-adapter, so they follow ordinary
 * Drizzle/Postgres convention (snake_case DB columns, camelCase JS keys) — precedented by the one
 * non-adapter column that already exists on `users`, `passwordHash` → `password_hash`.
 *
 * `type`/`packType`/`status`/`provider` are plain `text`, not Postgres enums — matches how
 * `Item['source']` is already a plain TS union validated at the app boundary elsewhere in this
 * app, and avoids `ALTER TYPE ADD VALUE` migration ceremony as new ledger types (promo, referral)
 * or pack sizes get added later.
 */

/**
 * Append-only. `idempotencyKey` (e.g. `consumption:{scanId}`, `refund:{scanId}`,
 * `signup_bonus:{userId}`, `purchase:stripe:{providerRef}`) is what makes every credit operation
 * safe to retry — a duplicate insert attempt hits the unique constraint instead of double-applying.
 */
export const creditLedger = pgTable('credit_ledger', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  /** Signed: positive credits in (signup_bonus/purchase/promo/referral/refund), negative out (consumption). */
  amount: integer('amount').notNull(),
  relatedScanId: text('related_scan_id'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})

/**
 * A read-optimized cache of each user's balance, kept in sync with `creditLedger` atomically in
 * the same DB transaction as every ledger insert (see src/lib/credits/repository.ts). The `CHECK`
 * is defense-in-depth, not the primary mechanism — application logic in `applyLedgerEntry` already
 * guards every debit, so this should never actually fire from normal app code.
 */
export const creditBalances = pgTable(
  'credit_balances',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
  },
  (table) => [check('credit_balances_balance_non_negative', sql`${table.balance} >= 0`)]
)

/**
 * One row per completed Stripe Checkout. `providerRef` (the Checkout Session id) is the primary
 * defense against the webhook redelivering the same `checkout.session.completed` event — a
 * duplicate insert attempt hits the unique constraint and the grant is skipped as already-applied.
 */
export const purchases = pgTable('purchases', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  packType: text('pack_type').notNull(),
  creditsGranted: integer('credits_granted').notNull(),
  amountPaidMinorUnits: integer('amount_paid_minor_units').notNull(),
  currency: text('currency').notNull(),
  provider: text('provider').notNull(),
  providerRef: text('provider_ref').notNull().unique(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})
