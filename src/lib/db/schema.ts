import { pgTable, primaryKey, text, timestamp, integer } from 'drizzle-orm/pg-core'

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
