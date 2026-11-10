import { DrizzleAdapter } from '@auth/drizzle-adapter'
import type { NextAuthConfig } from 'next-auth'
import { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db/client'
import { accounts, users } from '@/lib/db/schema'
import { grantSignupBonus } from '@/lib/credits/grants'
import { authenticateWithPassword, UNVERIFIED } from './authenticate'
import { drizzleUserRepository } from './register'
import { normalizeEmail } from './validation'

/** Right password, unconfirmed email: the client asks for the emailed code instead of failing. */
class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified'
}

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts }),
  // Required whenever a Credentials provider is present — Auth.js does not persist
  // Credentials-authenticated sessions to the database, only OAuth ones. Also matches the
  // "never trust a token for money" decision in CLAUDE.md's Post-MVP Architecture: the JWT
  // carries identity only, credit balance (once it exists) is always read fresh from the DB.
  session: { strategy: 'jwt' },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email : null
        const password = typeof credentials?.password === 'string' ? credentials.password : null
        if (!email || !password) return null

        const result = await authenticateWithPassword(email, password)
        if (result === UNVERIFIED) throw new EmailNotVerifiedError()
        return result
      },
    }),
  ],
  callbacks: {
    // Google has verified the address, so it outranks a password account that never did: that
    // one is removed first, otherwise the email would be "taken" and Google sign-in would fail.
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && typeof profile?.email === 'string') {
        await drizzleUserRepository.deleteUnverified(normalizeEmail(profile.email))
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id
      }
      return session
    },
  },
  events: {
    // Fires only for adapter-created users — i.e. the Google OAuth path. The email/password path
    // bypasses the adapter entirely (see src/lib/auth/register.ts, which grants the same bonus
    // directly), so this is the *only* place Google signups get their bonus. Never fails the
    // sign-in itself over a credits hiccup — grantSignupBonus is idempotent, safe to retry later.
    async createUser({ user }) {
      if (!user.id) return
      // A Google account for a mailbox that already has a password account (e.g. name+x@gmail.com)
      // is allowed in, but the free scans were already given to that mailbox.
      if (user.email && (await drizzleUserRepository.mailboxTakenByOther(normalizeEmail(user.email)))) return
      try {
        await grantSignupBonus(user.id)
      } catch (error) {
        console.error('auth: failed to grant signup bonus', error)
      }
    },
  },
}
