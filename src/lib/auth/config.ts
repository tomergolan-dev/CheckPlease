import { DrizzleAdapter } from '@auth/drizzle-adapter'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db/client'
import { accounts, users } from '@/lib/db/schema'
import { authenticateWithPassword } from './authenticate'

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

        return authenticateWithPassword(email, password)
      },
    }),
  ],
  callbacks: {
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
}
