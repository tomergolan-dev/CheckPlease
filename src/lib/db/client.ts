import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'

/**
 * The Pool-based (WebSocket) Neon driver, not the HTTP driver — deliberately, even though
 * nothing in Phase 1 needs a transaction yet. The HTTP driver (drizzle-orm/neon-http) can only
 * run single, non-interactive queries: no `db.transaction(async (tx) => ...)` with application
 * logic between statements. The credit ledger (a later phase, see Post-MVP Architecture in
 * CLAUDE.md) needs exactly that — an atomic reserve-then-finalize-or-refund sequence with
 * concurrency-safe balance checks — so the connection mode is chosen now to not foreclose that,
 * rather than switching drivers under a future phase.
 */
neonConfig.webSocketConstructor = ws

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon closes idle connections (and suspends the database when it's quiet). Without limits, a
  // query sent over a connection that was already dead hung for minutes before failing: these
  // make it fail in seconds instead, and the next query opens a fresh connection.
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
  query_timeout: 20_000,
})

// An idle connection dropped by the server emits 'error' on the pool; unhandled, that would crash
// the process. The pool already discards the connection, so logging is all that's needed.
pool.on('error', (error: Error) => {
  console.error('db: idle connection error', error)
})

export const db = drizzle({ client: pool, schema })
